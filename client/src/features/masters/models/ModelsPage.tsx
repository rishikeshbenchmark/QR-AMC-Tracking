import {
  ActionIcon,
  Alert,
  Button,
  Center,
  Group,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/api/client';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import type { DataTableColumn, SortOrder } from '@/components/DataTable';
import { useMakes } from '@/features/masters/makes/makes.queries';

import type { Model } from './models.api';
import { ModelFormModal } from './ModelFormModal';
import { useDeleteModel, useModels } from './models.queries';
import type { ModelSortField } from './models.schemas';

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;
const MAKE_FILTER_PARAMS = { page: 1, limit: 100, sort: 'name' as const, order: 'asc' as const };
const ALL_MAKES_VALUE = '__all__';

export function ModelsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ModelSortField>('name');
  const [order, setOrder] = useState<SortOrder>('asc');
  const [makeFilter, setMakeFilter] = useState<string | null>(null);

  const [editing, setEditing] = useState<Model | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Model | null>(null);

  // A new search, sort, OR make filter resets to page 1 — page 3 of the old (unfiltered) result set
  // is meaningless once the filter changes. This extends the same effect the category/make template
  // uses for search/sort, with makeFilter added to the dependency list per the task doc.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort, order, makeFilter]);

  const query = useModels({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    sort,
    order,
    // Server-side filter — makeId is part of the query key (see models.queries.ts), so this is a
    // real filtered query, not a client-side slice of the unfiltered page.
    makeId: makeFilter ?? undefined,
  });

  const deleteModel = useDeleteModel();

  const makesQuery = useMakes(MAKE_FILTER_PARAMS);
  const makeFilterOptions = [
    { value: ALL_MAKES_VALUE, label: 'All makes' },
    ...(makesQuery.data?.makes ?? []).map((m) => ({ value: m.id, label: m.name })),
  ];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (model: Model) => {
    setEditing(model);
    setFormOpen(true);
  };

  const handleSortChange = (field: string, nextOrder: SortOrder) => {
    setSort(field as ModelSortField);
    setOrder(nextOrder);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteModel.mutateAsync(pendingDelete.id);
      notifications.show({ message: `Model “${pendingDelete.name}” deleted.`, color: 'green' });
      setPendingDelete(null);
    } catch (error) {
      notifications.show({
        message: getApiErrorMessage(error, 'Could not delete the model.'),
        color: 'red',
      });
    }
  };

  const columns: DataTableColumn<Model>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (row) => row.name },
    { key: 'make', header: 'Make', render: (row) => row.makeName },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 96,
      render: (row) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <Tooltip label="Edit">
            <ActionIcon variant="subtle" aria-label={`Edit ${row.name}`} onClick={() => openEdit(row)}>
              <IconEdit size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete">
            <ActionIcon
              variant="subtle"
              color="red"
              aria-label={`Delete ${row.name}`}
              onClick={() => setPendingDelete(row)}
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
  ];

  const models = query.data?.models ?? [];
  const total = query.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasSearch = debouncedSearch.trim().length > 0;

  return (
    <Stack maw={860}>
      <Group justify="space-between">
        <Title order={3}>Models</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          New model
        </Button>
      </Group>

      <Group>
        <TextInput
          placeholder="Search models"
          leftSection={<IconSearch size={16} />}
          value={searchInput}
          onChange={(event) => setSearchInput(event.currentTarget.value)}
          aria-label="Search models"
          maw={320}
        />
        <Select
          placeholder="Filter by make"
          aria-label="Filter by make"
          data={makeFilterOptions}
          value={makeFilter ?? ALL_MAKES_VALUE}
          onChange={(value) => setMakeFilter(value && value !== ALL_MAKES_VALUE ? value : null)}
          disabled={makesQuery.isLoading}
          w={220}
          allowDeselect={false}
        />
      </Group>

      {query.isLoading ? (
        <Stack gap="xs">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} height={40} radius="sm" />
          ))}
        </Stack>
      ) : query.isError ? (
        <Alert color="red" role="alert" variant="light">
          <Group justify="space-between">
            <Text size="sm">{getApiErrorMessage(query.error, 'Could not load models.')}</Text>
            <Button size="xs" variant="light" onClick={() => query.refetch()}>
              Retry
            </Button>
          </Group>
        </Alert>
      ) : models.length === 0 ? (
        <Center mih={160}>
          <Stack align="center" gap="xs">
            <Text c="dimmed">
              {hasSearch
                ? 'No models match your search.'
                : makeFilter
                  ? 'No models under this make yet.'
                  : 'No models yet.'}
            </Text>
            {!hasSearch && !makeFilter && (
              <Button variant="light" leftSection={<IconPlus size={16} />} onClick={openCreate}>
                Add the first one
              </Button>
            )}
          </Stack>
        </Center>
      ) : (
        <Stack>
          <DataTable
            columns={columns}
            rows={models}
            rowKey={(row) => row.id}
            isRefetching={query.isFetching}
            sort={sort}
            order={order}
            onSortChange={handleSortChange}
          />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {total} model{total === 1 ? '' : 's'}
            </Text>
            {totalPages > 1 && <Pagination value={page} onChange={setPage} total={totalPages} />}
          </Group>
        </Stack>
      )}

      <ModelFormModal opened={isFormOpen} model={editing} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        opened={pendingDelete !== null}
        title="Delete model"
        destructive
        loading={deleteModel.isPending}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      >
        Delete <strong>{pendingDelete?.name}</strong>? It will be removed from the list.
      </ConfirmDialog>
    </Stack>
  );
}
