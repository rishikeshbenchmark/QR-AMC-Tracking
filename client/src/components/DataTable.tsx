import { Box, Center, LoadingOverlay, Table, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react';
import type { ReactNode } from 'react';

export type SortOrder = 'asc' | 'desc';

export interface DataTableColumn<TRow> {
  /** Stable key; also the server sort field when `sortable` is set. */
  key: string;
  header: ReactNode;
  render: (row: TRow) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: number | string;
}

interface DataTableProps<TRow> {
  columns: DataTableColumn<TRow>[];
  rows: TRow[];
  /** Stable React key per row. */
  rowKey: (row: TRow) => string;
  /** Shows a non-blocking overlay over the table body during a background refetch. */
  isRefetching?: boolean;
  /** Current server sort state, so headers can render the active direction. */
  sort?: string;
  order?: SortOrder;
  /** Called when a sortable header is activated; toggles order when the same column is re-clicked. */
  onSortChange?: (field: string, order: SortOrder) => void;
}

/**
 * Presentational, feature-agnostic table. It knows nothing about categories or any master — every
 * master and the asset list reuse it (CLAUDE.md: shared components hold no feature knowledge). The
 * page owns the loading/error/empty states; this component renders the success table plus a
 * background-refetch overlay.
 */
export function DataTable<TRow>({
  columns,
  rows,
  rowKey,
  isRefetching = false,
  sort,
  order,
  onSortChange,
}: DataTableProps<TRow>) {
  const handleSort = (column: DataTableColumn<TRow>) => {
    if (!column.sortable || !onSortChange) return;
    const nextOrder: SortOrder = sort === column.key && order === 'asc' ? 'desc' : 'asc';
    onSortChange(column.key, nextOrder);
  };

  return (
    <Box pos="relative">
      <LoadingOverlay visible={isRefetching} zIndex={1} overlayProps={{ blur: 1 }} />
      <Table.ScrollContainer minWidth={480}>
        <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              {columns.map((column) => (
                <Table.Th key={column.key} w={column.width} ta={column.align}>
                  {column.sortable ? (
                    <SortableHeader
                      active={sort === column.key}
                      order={order}
                      onClick={() => handleSort(column)}
                    >
                      {column.header}
                    </SortableHeader>
                  ) : (
                    column.header
                  )}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={rowKey(row)}>
                {columns.map((column) => (
                  <Table.Td key={column.key} ta={column.align}>
                    {column.render(row)}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Box>
  );
}

function SortableHeader({
  active,
  order,
  onClick,
  children,
}: {
  active: boolean;
  order?: SortOrder;
  onClick: () => void;
  children: ReactNode;
}) {
  const Icon = active ? (order === 'asc' ? IconChevronUp : IconChevronDown) : IconSelector;
  return (
    <UnstyledButton
      onClick={onClick}
      aria-label={`Sort by column${active ? `, currently ${order === 'asc' ? 'ascending' : 'descending'}` : ''}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 'inherit' }}
    >
      {children}
      <Center>
        <Icon size={14} stroke={1.5} aria-hidden />
      </Center>
    </UnstyledButton>
  );
}
