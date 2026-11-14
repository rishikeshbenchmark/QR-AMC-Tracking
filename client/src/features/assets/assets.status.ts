/**
 * Client mirror of the server's asset status vocabulary (server assets.lifecycle.ts, which itself
 * mirrors ck_assets_status). Kept in step so the two cannot drift.
 *
 * Deliberately NO transition map here: legality is the server's decision and it travels down on the
 * asset detail as `allowedTransitions`. Duplicating the rules on the client would give us two
 * sources of truth and one of them would go stale.
 */
export const ASSET_STATUSES = [
  'CREATED',
  'PURCHASED',
  'QC_PENDING',
  'QC_PASSED',
  'QC_FAILED',
  'ALLOCATED',
  'DISPATCHED',
  'INSTALLED',
  'WARRANTY_ACTIVE',
  'WARRANTY_EXPIRED',
  'AMC_ACTIVE',
  'AMC_EXPIRED',
  'DISCARDED',
] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

const STATUS_LABELS: Record<AssetStatus, string> = {
  CREATED: 'Created',
  PURCHASED: 'Purchased',
  QC_PENDING: 'QC pending',
  QC_PASSED: 'QC passed',
  QC_FAILED: 'QC failed',
  ALLOCATED: 'Allocated',
  DISPATCHED: 'Dispatched',
  INSTALLED: 'Installed',
  WARRANTY_ACTIVE: 'Warranty active',
  WARRANTY_EXPIRED: 'Warranty expired',
  AMC_ACTIVE: 'AMC active',
  AMC_EXPIRED: 'AMC expired',
  DISCARDED: 'Discarded',
};

/** Mantine palette keys. Colour is decoration — the label always carries the meaning. */
const STATUS_COLORS: Record<AssetStatus, string> = {
  CREATED: 'gray',
  PURCHASED: 'blue',
  QC_PENDING: 'yellow',
  QC_PASSED: 'teal',
  QC_FAILED: 'red',
  ALLOCATED: 'indigo',
  DISPATCHED: 'cyan',
  INSTALLED: 'green',
  WARRANTY_ACTIVE: 'green',
  WARRANTY_EXPIRED: 'orange',
  AMC_ACTIVE: 'lime',
  AMC_EXPIRED: 'orange',
  DISCARDED: 'dark',
};

export function assetStatusLabel(status: AssetStatus): string {
  return STATUS_LABELS[status];
}

export function assetStatusColor(status: AssetStatus): string {
  return STATUS_COLORS[status];
}

/** Options for the status filter on the list page. */
export const ASSET_STATUS_OPTIONS = ASSET_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));
