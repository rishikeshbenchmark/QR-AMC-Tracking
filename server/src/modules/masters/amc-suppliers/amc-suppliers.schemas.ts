import { z } from 'zod';

/**
 * Validation contract for the AMC Supplier master. Name is trimmed at the boundary so trailing
 * whitespace never creates a "different" duplicate, and the tenant is never taken from the client
 * (it comes from the JWT in the service), so it does not appear here.
 */
const AMC_SUPPLIER_NAME_MAX = 255;

const UpdateAmccSupplierName = z
  .string({ required_error: 'Name is required.' })
  .trim()
  .min(1, 'Name is required.')
  .max(
    AMC_SUPPLIER_NAME_MAX,
    `Name must be at most ${AMC_SUPPLIER_NAME_MAX} characters.`,
  );

export const createAmcSupplierSchema = z.object({
  name: UpdateAmccSupplierName,
});

/** Update replaces the whole editable surface — for an AMC supplier that is just the name. */
export const updateAmcSupplierSchema = z.object({
  name: UpdateAmccSupplierName,
});

export const amcSupplierIdParamSchema = z.object({
  id: z.string().uuid('Invalid AMC supplier id.'),
});

/** Whitelisted list controls. Unknown sort/order values are rejected, never passed to the query. */
export const listAmcSuppliersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(AMC_SUPPLIER_NAME_MAX).optional(),
  sort: z.enum(['name', 'createdAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateAmcSupplierInput = z.infer<typeof createAmcSupplierSchema>;
export type UpdateAmcSupplierInput = z.infer<typeof updateAmcSupplierSchema>;
export type AmcSupplierIdParam = z.infer<typeof amcSupplierIdParamSchema>;
export type ListAmcSuppliersQuery = z.infer<typeof listAmcSuppliersQuerySchema>;