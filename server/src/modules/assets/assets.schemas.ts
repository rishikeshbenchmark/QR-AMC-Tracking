import { z } from 'zod';

import { ASSET_STATUSES } from './assets.lifecycle';

/**
 * Validation contract for the asset domain. Serial numbers are trimmed AND uppercased here, at the
 * boundary, not in the repository (CLAUDE.md) — so "  ab-123 " and "AB-123" collide on the filtered
 * unique index instead of creating two live assets for one physical machine.
 *
 * `companyId` never appears: it comes from the JWT in the service, never the client.
 */
const SERIAL_MAX = 100;
const REMARKS_MAX = 500;

const uuid = (label: string) => z.string({ required_error: `${label} is required.` }).uuid(`Invalid ${label}.`);

const serialNumber = z
  .string({ required_error: 'Serial number is required.' })
  .trim()
  .min(1, 'Serial number is required.')
  .max(SERIAL_MAX, `Serial number must be at most ${SERIAL_MAX} characters.`)
  .transform((value) => value.toUpperCase());

/**
 * Purchase Step 1 — what the person holding the physical box can actually see: what it is, its
 * serial, and who supplied it. Everything else (PO, invoice, dates, cost) arrives later as Step 2.
 */
export const createAssetSchema = z.object({
  categoryId: uuid('category'),
  makeId: uuid('make'),
  modelId: uuid('model'),
  serialNumber,
  supplierId: uuid('supplier'),
});

/**
 * The manual status dropdown (ADR-0003). One endpoint, one target value; legality is decided by
 * `assets.lifecycle`, not here — zod only proves the value is in the vocabulary.
 */
export const changeAssetStatusSchema = z.object({
  status: z.enum(ASSET_STATUSES as [string, ...string[]], {
    required_error: 'Status is required.',
    invalid_type_error: 'Unknown status.',
  }),
  remarks: z.string().trim().min(1).max(REMARKS_MAX).optional(),
});

export const assetIdParamSchema = z.object({
  id: uuid('asset id'),
});

/** Whitelisted list controls — sort fields and filters are allowlisted, never passed through raw. */
export const listAssetsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  /** Serial-number search (partial). SQL Server's collation makes it case-insensitive. */
  search: z.string().trim().min(1).max(SERIAL_MAX).optional(),
  status: z.enum(ASSET_STATUSES as [string, ...string[]]).optional(),
  categoryId: z.string().uuid('Invalid category.').optional(),
  makeId: z.string().uuid('Invalid make.').optional(),
  modelId: z.string().uuid('Invalid model.').optional(),
  supplierId: z.string().uuid('Invalid supplier.').optional(),
  sort: z.enum(['serialNumber', 'status', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type ChangeAssetStatusInput = z.infer<typeof changeAssetStatusSchema>;
export type AssetIdParam = z.infer<typeof assetIdParamSchema>;
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;
