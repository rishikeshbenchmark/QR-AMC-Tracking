import {
  Alert,
  Anchor,
  Button,
  Card,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Timeline,
  Title,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getApiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';

import type { AssetDetail, AssetPurchase, AssetStatusHistoryEntry } from './assets.api';
import { useAsset } from './assets.queries';
import { assetStatusColor, assetStatusLabel } from './assets.status';
import { ChangeStatusModal } from './ChangeStatusModal';

const EM_DASH = '—';

/**
 * One label/value pair. A value that isn't filled in yet shows a dash, never an empty cell.
 *
 * The value renders as a <div> rather than Text's default <p>, because callers pass element
 * children (the monospaced asset id) and a <p> inside a <p> is invalid HTML.
 */
function DetailField({ label, children }: { label: string; children: ReactNode }) {
  const isEmpty = children === null || children === undefined || children === '';
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="sm" component="div">
        {isEmpty ? EM_DASH : children}
      </Text>
    </Stack>
  );
}

function formatDate(value: string | null): string | null {
  return value === null ? null : new Date(value).toLocaleDateString();
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

/**
 * Purchase panel. Step 1 fills only the supplier — every other field lands with the paperwork in
 * Step 2 and reads as a dash until then.
 *
 * `costPrice` is rendered only when the KEY is present: the server omits it entirely for a user
 * without `asset.cost_price.read`, so an absent key means "masked" and a null value means
 * "permitted, not captured yet". Testing the value instead of the key would show Staff a cost row.
 */
function PurchaseCard({ purchase }: { purchase: AssetPurchase | null }) {
  return (
    <Card withBorder padding="md" radius="md">
      <Stack gap="md">
        <Title order={5}>Purchase</Title>
        {purchase === null ? (
          <Text size="sm" c="dimmed">
            No purchase record for this asset.
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="md">
            <DetailField label="Supplier">{purchase.supplierName}</DetailField>
            <DetailField label="PO number">{purchase.poNumber}</DetailField>
            <DetailField label="Supplier invoice">{purchase.supplierInvoiceNo}</DetailField>
            <DetailField label="Purchase date">{formatDate(purchase.purchaseDate)}</DetailField>
            <DetailField label="Supplier warranty start">
              {formatDate(purchase.supplierWarrantyStart)}
            </DetailField>
            <DetailField label="Supplier warranty end">
              {formatDate(purchase.supplierWarrantyEnd)}
            </DetailField>
            <DetailField label="AMC support">{purchase.amcSupport}</DetailField>
            <DetailField label="AMC supplier">{purchase.amcSupplierName}</DetailField>
            {'costPrice' in purchase && (
              <DetailField label="Cost price">{purchase.costPrice}</DetailField>
            )}
          </SimpleGrid>
        )}
      </Stack>
    </Card>
  );
}

/**
 * The status journey, oldest first, so the bottom entry is where the asset stands today. This is
 * also what enforces the QC gate on the server — the history is the only record that QC happened.
 */
function StatusHistoryCard({ entries }: { entries: AssetStatusHistoryEntry[] }) {
  return (
    <Card withBorder padding="md" radius="md">
      <Stack gap="md">
        <Title order={5}>Status history</Title>
        {entries.length === 0 ? (
          <Text size="sm" c="dimmed">
            No status changes recorded.
          </Text>
        ) : (
          <Timeline active={entries.length - 1} bulletSize={14} lineWidth={2}>
            {entries.map((entry) => (
              <Timeline.Item
                key={entry.id}
                title={
                  <Group gap="xs">
                    <StatusBadge
                      label={assetStatusLabel(entry.toStatus)}
                      color={assetStatusColor(entry.toStatus)}
                      size="xs"
                    />
                    {entry.fromStatus !== null && (
                      <Text size="xs" c="dimmed">
                        from {assetStatusLabel(entry.fromStatus)}
                      </Text>
                    )}
                  </Group>
                }
              >
                <Text size="xs" c="dimmed">
                  {formatDateTime(entry.changedAt)}
                  {entry.changedByName !== null && ` · ${entry.changedByName}`}
                </Text>
                {entry.remarks !== null && <Text size="sm">{entry.remarks}</Text>}
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Stack>
    </Card>
  );
}

function IdentityCard({ asset }: { asset: AssetDetail }) {
  return (
    <Card withBorder padding="md" radius="md">
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="md">
        <DetailField label="Category">{asset.categoryName}</DetailField>
        <DetailField label="Make">{asset.makeName}</DetailField>
        <DetailField label="Model">{asset.modelName}</DetailField>
        <DetailField label="Registered">{formatDateTime(asset.createdAt)}</DetailField>
        <DetailField label="Last updated">
          {asset.updatedAt === null ? null : formatDateTime(asset.updatedAt)}
        </DetailField>
        {/* The asset id is the permanent QR payload, so it is worth showing verbatim. */}
        <DetailField label="Asset ID">
          <Text size="xs" ff="monospace">
            {asset.id}
          </Text>
        </DetailField>
      </SimpleGrid>
    </Card>
  );
}

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const [isStatusOpen, setStatusOpen] = useState(false);

  const query = useAsset(id);

  if (query.isLoading) {
    return (
      <Stack>
        <Skeleton height={36} width={280} radius="sm" />
        <Skeleton height={140} radius="md" />
        <Skeleton height={180} radius="md" />
      </Stack>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Stack>
        <Anchor component={Link} to="/assets" size="sm">
          <Group gap={4}>
            <IconArrowLeft size={14} />
            Back to assets
          </Group>
        </Anchor>
        <Alert color="red" role="alert" variant="light">
          <Group justify="space-between">
            <Text size="sm">{getApiErrorMessage(query.error, 'Could not load this asset.')}</Text>
            <Button size="xs" variant="light" onClick={() => query.refetch()}>
              Retry
            </Button>
          </Group>
        </Alert>
      </Stack>
    );
  }

  const asset = query.data;

  return (
    <Stack>
      <Anchor component={Link} to="/assets" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={14} />
          Back to assets
        </Group>
      </Anchor>

      <Group justify="space-between" align="center">
        <Group gap="sm">
          <Title order={3}>{asset.serialNumber}</Title>
          <StatusBadge
            label={assetStatusLabel(asset.status)}
            color={assetStatusColor(asset.status)}
            size="md"
          />
        </Group>
        {can('asset.status.change') && (
          <Button variant="light" onClick={() => setStatusOpen(true)}>
            Change status
          </Button>
        )}
      </Group>

      <IdentityCard asset={asset} />
      <PurchaseCard purchase={asset.purchase} />
      <StatusHistoryCard entries={asset.statusHistory} />

      <ChangeStatusModal
        opened={isStatusOpen}
        asset={asset}
        onClose={() => setStatusOpen(false)}
      />
    </Stack>
  );
}
