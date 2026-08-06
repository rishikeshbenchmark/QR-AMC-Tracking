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

import type { Supplier } from './suppliers.api';
import { SupplierFormModal } from './suppliersFormModal';
import { useSuppliers, useDeleteSupplier } from './suppliers.queries';
import type { SupplierSortField } from './suppliers.schemas';

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export function SuppliersPage() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SupplierSortField>('name');
  const [order, setOrder] = useState<SortOrder>('asc');

  const [editing, setEditing] = useState<Supplier | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Supplier | null>(null);

  // A new search or sort resets to page 1 — page 3 of the old result set is meaningless for the new one.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort, order]);

  const query = useSuppliers({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    sort,
    order,
  });

  const deleteSupplier = useDeleteSupplier();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setFormOpen(true);
  };

  const handleSortChange = (field: string, nextOrder: SortOrder) => {
    setSort(field as SupplierSortField);
    setOrder(nextOrder);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteSupplier.mutateAsync(pendingDelete.id);
      notifications.show({ message: `Supplier “${pendingDelete.name}” deleted.`, color: 'green' });
      setPendingDelete(null);
    } catch (error) {
      notifications.show({
        message: getApiErrorMessage(error, 'Could not delete the supplier.'),
        color: 'red',
      });
    }
  };

  const columns: DataTableColumn<Supplier>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (row) => row.name },
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

  const suppliers = query.data?.suppliers ?? [];
  const total = query.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasSearch = debouncedSearch.trim().length > 0;

  return (
    <Stack maw={860}>
      <Group justify="space-between">
        <Title order={3}>Suppliers</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          New supplier
        </Button>
      </Group>

      <TextInput
        placeholder="Search suppliers"
        leftSection={<IconSearch size={16} />}
        value={searchInput}
        onChange={(event) => setSearchInput(event.currentTarget.value)}
        aria-label="Search suppliers"
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
            <Text size="sm">{getApiErrorMessage(query.error, 'Could not load suppliers.')}</Text>
            <Button size="xs" variant="light" onClick={() => query.refetch()}>
              Retry
            </Button>
          </Group>
        </Alert>
      ) : suppliers.length === 0 ? (
        <Center mih={160}>
          <Stack align="center" gap="xs">
            <Text c="dimmed">
              {hasSearch ? 'No suppliers match your search.' : 'No suppliers yet.'}
            </Text>
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
            rows={suppliers}
            rowKey={(row) => row.id}
            isRefetching={query.isFetching}
            sort={sort}
            order={order}
            onSortChange={handleSortChange}
          />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {total} supplier{total === 1 ? 's' : 's'} total
            </Text>
            {totalPages > 1 && <Pagination value={page} onChange={setPage} total={totalPages} />}
          </Group>
        </Stack>
      )}

      <SupplierFormModal
        opened={isFormOpen}
        supplier={editing}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        opened={pendingDelete !== null}
        title="Delete supplier"
        destructive
        loading={deleteSupplier.isPending}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      >
        Delete <strong>{pendingDelete?.name}</strong>? It will be removed from the list.
      </ConfirmDialog>
    </Stack>
  );
}
