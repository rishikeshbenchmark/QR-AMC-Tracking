import type { Prisma } from '@prisma/client';

/**
 * The audit trail. Every create/update/delete/status-change writes one or more rows here, in the
 * SAME transaction as the mutation itself (CLAUDE.md: "audit row for every mutation"). Rows are
 * insert-only and never updated or deleted — audit_logs has no FK to users on purpose, so the
 * trail survives a user being removed.
 *
 * This is shared/ because it is genuinely cross-module: masters, assets, purchases, and sales all
 * write the same shape. Keep it dumb — it records what it is told and holds no business rules.
 */
export const AUDIT_ACTION = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  STATUS_CHANGE: 'STATUS_CHANGE',
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export interface AuditEntry {
  companyId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  /** Set on UPDATE rows (one row per changed field); null for whole-row CREATE/DELETE. */
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  changedBy: string;
}

export interface FieldChange {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}

/**
 * Compares two versions of a record over an explicit set of keys and returns only the fields that
 * actually changed. Callers pass the key list so audit never diffs a field it shouldn't (timestamps,
 * tenant id). Values are stringified so the audit column (NVARCHAR) holds a stable representation.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
  keys: Array<keyof T>,
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const key of keys) {
    const oldValue = toAuditValue(before[key]);
    const newValue = toAuditValue(after[key]);
    if (oldValue !== newValue) {
      changes.push({ fieldName: String(key), oldValue, newValue });
    }
  }
  return changes;
}

function toAuditValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Writes one or more audit rows through the given transaction client. Always call this with the
 * `tx` from the enclosing `prisma.$transaction`, never the bare client, so the audit row commits or
 * rolls back atomically with the mutation it records.
 */
export async function writeAuditLog(
  tx: Prisma.TransactionClient,
  entries: AuditEntry | AuditEntry[],
): Promise<void> {
  const rows = Array.isArray(entries) ? entries : [entries];
  if (rows.length === 0) return;
  await tx.auditLog.createMany({
    data: rows.map((entry) => ({
      companyId: entry.companyId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      fieldName: entry.fieldName ?? null,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      changedBy: entry.changedBy,
    })),
  });
}
