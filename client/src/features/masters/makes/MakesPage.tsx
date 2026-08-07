import {
  ActionIcon,
  Alert,
  Button,
  Center,
  Group,
  Pagination,
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

import type { Make } from './makes.api';
import { MakeFormModal } from './MakeFormModal';
import { useDeleteMake, useMakes } from './makes.queries';
import type { MakeSortField } from './makes.schemas';

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export function MakesPage() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<MakeSortField>('name');
  const [order, setOrder] = useState<SortOrder>('asc');

  const [editing, setEditing] = useState<Make | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Make | null>(null);

  // A new search or sort resets to page 1 — page 3 of the old result set is meaningless for the new one.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort, order]);

  const query = useMakes({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    sort,
    order,
  });

  const deleteMake = useDeleteMake();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (make: Make) => {
    setEditing(make);
    setFormOpen(true);
  };

  const handleSortChange = (field: string, nextOrder: SortOrder) => {
    setSort(field as MakeSortField);
    setOrder(nextOrder);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMake.mutateAsync(pendingDelete.id);
      notifications.show({ message: `Make “${pendingDelete.name}” deleted.`, color: 'green' });
      setPendingDelete(null);
    } catch (error) {
      notifications.show({
        message: getApiErrorMessage(error, 'Could not delete the make.'),
        color: 'red',
      });
    }
  };

  const columns: DataTableColumn<Make>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (row) => row.name },
    { key: 'category', header: 'Category', render: (row) => row.categoryName },
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

  const makes = query.data?.makes ?? [];
  const total = query.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasSearch = debouncedSearch.trim().length > 0;

  return (
    <Stack maw={860}>
      <Group justify="space-between">
        <Title order={3}>Makes</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          New make
        </Button>
      </Group>

      <TextInput
        placeholder="Search makes"
        leftSection={<IconSearch size={16} />}
        value={searchInput}
        onChange={(event) => setSearchInput(event.currentTarget.value)}
        aria-label="Search makes"
        maw={320}
      />

      {query.isLoading ? (
        <Stack gap="xs">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} height={40} radius="sm" />
          ))}
        </Stack>
      ) : query.isError ? (
        <Alert color="red" role="alert" variant="light">
          <Group justify="space-between">
            <Text size="sm">{getApiErrorMessage(query.error, 'Could not load makes.')}</Text>
            <Button size="xs" variant="light" onClick={() => query.refetch()}>
              Retry
            </Button>
          </Group>
        </Alert>
      ) : makes.length === 0 ? (
        <Center mih={160}>
          <Stack align="center" gap="xs">
            <Text c="dimmed">{hasSearch ? 'No makes match your search.' : 'No makes yet.'}</Text>
            {!hasSearch && (
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
            rows={makes}
            rowKey={(row) => row.id}
            isRefetching={query.isFetching}
            sort={sort}
            order={order}
            onSortChange={handleSortChange}
          />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {total} make{total === 1 ? '' : 's'}
            </Text>
            {totalPages > 1 && <Pagination value={page} onChange={setPage} total={totalPages} />}
          </Group>
        </Stack>
      )}

      <MakeFormModal opened={isFormOpen} make={editing} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        opened={pendingDelete !== null}
        title="Delete make"
        destructive
        loading={deleteMake.isPending}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      >
        Delete <strong>{pendingDelete?.name}</strong>? It will be removed from the list.
      </ConfirmDialog>
    </Stack>
  );
}
