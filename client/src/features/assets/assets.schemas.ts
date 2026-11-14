import { z } from 'zod';

import { ASSET_STATUSES } from './assets.status';

/**
 * Client mirror of the server's asset contract (server assets.schemas.ts). The server validates
 * independently regardless — this is a courtesy that gives instant field feedback.
 *
 * The serial is uppercased here too, so what the user sees in the input is what gets stored and a
 * "duplicate serial" error is never a surprise about casing.
 */
export const SERIAL_MAX = 100;
export const REMARKS_MAX = 500;

export const registerAssetFormSchema = z.object({
  categoryId: z.string().uuid('Select a category.'),
  makeId: z.string().uuid('Select a make.'),
  modelId: z.string().uuid('Select a model.'),
  serialNumber: z
    .string()
    .trim()
    .min(1, 'Serial number is required.')
    .max(SERIAL_MAX, `Serial number must be at most ${SERIAL_MAX} characters.`)
    .transform((value) => value.toUpperCase()),
  supplierId: z.string().uuid('Select a supplier.'),
});

export type RegisterAssetFormValues = z.infer<typeof registerAssetFormSchema>;

/** What the form holds before validation — every picker starts empty, so the ids are nullable. */
export interface RegisterAssetFormInput {
  categoryId: string | null;
  makeId: string | null;
  modelId: string | null;
  serialNumber: string;
  supplierId: string | null;
}

export const changeStatusFormSchema = z.object({
  status: z.enum(ASSET_STATUSES, { required_error: 'Pick a status.' }),
  remarks: z
    .string()
    .trim()
    .max(REMARKS_MAX, `Remarks must be at most ${REMARKS_MAX} characters.`)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type ChangeStatusFormValues = z.infer<typeof changeStatusFormSchema>;

export const ASSET_SORT_FIELDS = ['serialNumber', 'status', 'createdAt'] as const;
export type AssetSortField = (typeof ASSET_SORT_FIELDS)[number];
