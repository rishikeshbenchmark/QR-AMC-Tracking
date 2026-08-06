import { z } from 'zod';

/**
 * Validation contract for the product-category master — the reference shape every other master
 * (make/model/supplier/customer) is cloned from. Name is trimmed at the boundary so trailing
 * whitespace never creates a "different" duplicate, and the tenant is never taken from the client
 * (it comes from the JWT in the service), so it does not appear here.
 */
const SUPPLIER_NAME_MAX = 255;

const supplierName = z
  .string({ required_error: 'Name is required.' })
  .trim()
  .min(1, 'Name is required.')
  .max(SUPPLIER_NAME_MAX, `Name must be at most ${SUPPLIER_NAME_MAX} characters.`);

  const supplierEmail = z
  .string()
  .trim()
  .max(255)
  .email('Enter a valid email address.')
  .optional()
  .or(z.literal('').transform(() => undefined));
  
export const createSupplierSchema = z.object({
  name: supplierName,
  email: supplierEmail,
});

/** Update replaces the whole editable surface — for a supplier that is just the name. */
export const updateSupplierSchema = z.object({
  name: supplierName,
  email: supplierEmail,
});

export const supplierIdParamSchema = z.object({
  id: z.string().uuid('Invalid supplier id.'),
});

/** Whitelisted list controls. Unknown sort/order values are rejected, never passed to the query. */
export const listSuppliersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(SUPPLIER_NAME_MAX).optional(),
  sort: z.enum(['name', 'createdAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type SupplierIdParam = z.infer<typeof supplierIdParamSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
