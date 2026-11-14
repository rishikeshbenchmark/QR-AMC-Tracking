import {
  Alert,
  Anchor,
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
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { getApiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { DataTable } from '@/components/DataTable';
import type { DataTableColumn, SortOrder } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { useCategoryOptions } from '@/features/masters/masterLookups';

import type { AssetListItem } from './assets.api';
import { useAssets } from './assets.queries';
import type { AssetSortField } from './assets.schemas';
import { ASSET_STATUS_OPTIONS, assetStatusColor, assetStatusLabel } from './assets.status';
import type { AssetStatus } from './assets.status';
import { RegisterAssetModal } from './RegisterAssetModal';

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * The asset register. Search is on the serial number only — it is the one identifier the person at
 * the shelf can read off the box, and the server's `search` filter matches nothing else.
 */
export function AssetsPage() {
  const navigate = useNavigate();
  const { can } = useAuth();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [status, setStatus] = useState<AssetStatus | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<AssetSortField>('createdAt');
  const [order, setOrder] = useState<SortOrder>('desc');

  const [isRegisterOpen, setRegisterOpen] = useState(false);

  // A new search, filter or sort resets to page 1 — page 3 of the old result set is meaningless.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, categoryId, sort, order]);

  const query = useAssets({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    status: status ?? undefined,
    categoryId: categoryId ?? undefined,
    sort,
    order,
  });

  const categories = useCategoryOptions();

  const handleSortChange = (field: string, nextOrder: SortOrder) => {
    setSort(field as AssetSortField);
    setOrder(nextOrder);
  };

  const columns: DataTableColumn<AssetListItem>[] = [
    {
      key: 'serialNumber',
      header: 'Serial number',
      sortable: true,
      render: (row) => (
        <Anchor component={Link} to={`/assets/${row.id}`} fw={500}>
          {row.serialNumber}
        </Anchor>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (row) => (
        <Stack gap={0}>
          <Text size="sm">
            {row.makeName} {row.modelName}
          </Text>
          <Text size="xs" c="dimmed">
            {row.categoryName}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <StatusBadge label={assetStatusLabel(row.status)} color={assetStatusColor(row.status)} />
      ),
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      render: (row) => row.supplierName ?? <Text c="dimmed">—</Text>,
    },
    {
      key: 'createdAt',
      header: 'Registered',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  const assets = query.data?.assets ?? [];
  const total = query.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isFiltered = debouncedSearch.trim().length > 0 || status !== null || categoryId !== null;
  const canCreate = can('asset.create');

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Assets</Title>
        {canCreate && (
          <Button leftSection={<IconPlus size={16} />} onClick={() => setRegisterOpen(true)}>
            Register asset
          </Button>
        )}
      </Group>

      <Group align="flex-end" gap="sm">
        <TextInput
          placeholder="Search serial number"
          leftSection={<IconSearch size={16} />}
          value={searchInput}
          onChange={(event) => setSearchInput(event.currentTarget.value)}
          aria-label="Search assets by serial number"
          w={260}
        />
        <Select
          placeholder="All statuses"
          aria-label="Filter by status"
          data={ASSET_STATUS_OPTIONS}
          value={status}
          onChange={(value) => setStatus(value as AssetStatus | null)}
          clearable
          w={180}
        />
        <Select
          placeholder="All categories"
          aria-label="Filter by category"
          data={(categories.data ?? []).map((row) => ({ value: row.id, label: row.name }))}
          value={categoryId}
          onChange={setCategoryId}
          disabled={categories.isLoading}
          searchable
          clearable
          w={200}
        />
      </Group>

      {query.isLoading ? (
        <Stack gap="xs">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} height={44} radius="sm" />
          ))}
        </Stack>
      ) : query.isError ? (
        <Alert color="red" role="alert" variant="light">
          <Group justify="space-between">
            <Text size="sm">{getApiErrorMessage(query.error, 'Could not load assets.')}</Text>
            <Button size="xs" variant="light" onClick={() => query.refetch()}>
              Retry
            </Button>
          </Group>
        </Alert>
      ) : assets.length === 0 ? (
        <Center mih={160}>
          <Stack align="center" gap="xs">
            <Text c="dimmed">
              {isFiltered ? 'No assets match these filters.' : 'No assets registered yet.'}
            </Text>
            {!isFiltered && canCreate && (
              <Button
                variant="light"
                leftSection={<IconPlus size={16} />}
                onClick={() => setRegisterOpen(true)}
              >
                Register the first one
              </Button>
            )}
          </Stack>
        </Center>
      ) : (
        <Stack>
          <DataTable
            columns={columns}
            rows={assets}
            rowKey={(row) => row.id}
            isRefetching={query.isFetching}
            sort={sort}
            order={order}
            onSortChange={handleSortChange}
          />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {total} asset{total === 1 ? '' : 's'}
            </Text>
            {totalPages > 1 && <Pagination value={page} onChange={setPage} total={totalPages} />}
          </Group>
        </Stack>
      )}

      <RegisterAssetModal
        opened={isRegisterOpen}
        onClose={() => setRegisterOpen(false)}
        // Straight to the new asset: the next thing anyone does with it is print its label.
        onCreated={(assetId) => navigate(`/assets/${assetId}`)}
      />
    </Stack>
  );
}
