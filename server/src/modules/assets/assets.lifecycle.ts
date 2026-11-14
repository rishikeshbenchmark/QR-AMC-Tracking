/**
 * The asset status vocabulary and the only place that decides whether a status change is legal
 * (ADR-0003). `assets.status` is ONE column, hand-picked from a dropdown by Admin/Backoffice — the
 * system never writes it. The vocabulary mirrors `ck_assets_status` in the init migration exactly;
 * if one changes, the other must change with it.
 *
 * These are pure functions on purpose: the rules are unit-tested without a database, and the same
 * map will be reused by the v2 scheduler.
 */
export const ASSET_STATUS = {
  CREATED: 'CREATED',
  PURCHASED: 'PURCHASED',
  QC_PENDING: 'QC_PENDING',
  QC_PASSED: 'QC_PASSED',
  QC_FAILED: 'QC_FAILED',
  ALLOCATED: 'ALLOCATED',
  DISPATCHED: 'DISPATCHED',
  INSTALLED: 'INSTALLED',
  WARRANTY_ACTIVE: 'WARRANTY_ACTIVE',
  WARRANTY_EXPIRED: 'WARRANTY_EXPIRED',
  AMC_ACTIVE: 'AMC_ACTIVE',
  AMC_EXPIRED: 'AMC_EXPIRED',
  DISCARDED: 'DISCARDED',
} as const;

export type AssetStatus = (typeof ASSET_STATUS)[keyof typeof ASSET_STATUS];

export const ASSET_STATUSES = Object.values(ASSET_STATUS) as AssetStatus[];

/**
 * Legal moves, keyed by current status. Forward-only along the Mail §3.1 sequence, plus DISCARDED
 * from anywhere still in play (HOD Q1.6: the end-of-life value is Discard, and resale discards the
 * old asset before the new one is minted).
 *
 * Two rules are HOD-sourced rather than inferred:
 *   - QC always precedes dispatch (Q1.5). The map cannot enforce that on its own because the single
 *     status column has no memory — see `requiresQcPassedHistory` below.
 *   - QC_FAILED is terminal; a failed asset is scrapped (Q1.5), so its only exit is DISCARDED.
 *
 * AMC_EXPIRED -> AMC_ACTIVE is a paid renewal superseding the previous contract, which is why the
 * only backward-looking edge in the map is that one.
 */
export const TRANSITIONS: Record<AssetStatus, readonly AssetStatus[]> = {
  [ASSET_STATUS.CREATED]: [ASSET_STATUS.PURCHASED, ASSET_STATUS.QC_PENDING, ASSET_STATUS.DISCARDED],
  [ASSET_STATUS.PURCHASED]: [ASSET_STATUS.QC_PENDING, ASSET_STATUS.DISCARDED],
  [ASSET_STATUS.QC_PENDING]: [ASSET_STATUS.QC_PASSED, ASSET_STATUS.QC_FAILED, ASSET_STATUS.DISCARDED],
  [ASSET_STATUS.QC_PASSED]: [ASSET_STATUS.ALLOCATED, ASSET_STATUS.DISPATCHED, ASSET_STATUS.DISCARDED],
  // Terminal apart from scrapping — HOD Q1.5.
  [ASSET_STATUS.QC_FAILED]: [ASSET_STATUS.DISCARDED],
  [ASSET_STATUS.ALLOCATED]: [ASSET_STATUS.DISPATCHED, ASSET_STATUS.DISCARDED],
  [ASSET_STATUS.DISPATCHED]: [ASSET_STATUS.INSTALLED, ASSET_STATUS.DISCARDED],
  [ASSET_STATUS.INSTALLED]: [ASSET_STATUS.WARRANTY_ACTIVE, ASSET_STATUS.DISCARDED],
  [ASSET_STATUS.WARRANTY_ACTIVE]: [ASSET_STATUS.WARRANTY_EXPIRED, ASSET_STATUS.DISCARDED],
  [ASSET_STATUS.WARRANTY_EXPIRED]: [ASSET_STATUS.AMC_ACTIVE, ASSET_STATUS.DISCARDED],
  [ASSET_STATUS.AMC_ACTIVE]: [ASSET_STATUS.AMC_EXPIRED, ASSET_STATUS.DISCARDED],
  // A renewal reactivates AMC cover; the contract row supersedes, the status returns.
  [ASSET_STATUS.AMC_EXPIRED]: [ASSET_STATUS.AMC_ACTIVE, ASSET_STATUS.DISCARDED],
  [ASSET_STATUS.DISCARDED]: [],
};

export function isAssetStatus(value: string): value is AssetStatus {
  return (ASSET_STATUSES as string[]).includes(value);
}

/** Whether moving `from` -> `to` is allowed by the map alone. A no-op move is not a transition. */
export function canTransition(from: AssetStatus, to: AssetStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedTransitionsFrom(from: AssetStatus): readonly AssetStatus[] {
  return TRANSITIONS[from];
}

/**
 * DISPATCHED is the one target that needs more than the map: the single status column cannot
 * remember that QC ever passed (an asset may sit in ALLOCATED long after), so the service checks
 * `asset_status_history` for a prior QC_PASSED row. Kept here so the whole dispatch rule reads in
 * one file.
 */
export function requiresQcPassedHistory(to: AssetStatus): boolean {
  return to === ASSET_STATUS.DISPATCHED;
}

/** Terminal states have no legal exit — used by the UI to disable the dropdown entirely. */
export function isTerminal(status: AssetStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
