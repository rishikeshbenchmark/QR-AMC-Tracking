import { z } from 'zod';

/**
 * Validation contract for the AMC-supplier master — the category template with a 255-wide name and
 * no email. The tenant never comes from the client.
 */
const AMC_SUPPLIER_NAME_MAX = 255;

const amcSupplierName = z
  .string({ required_error: 'Name is required.' })
  .trim()
  .min(1, 'Name is required.')
  .max(AMC_SUPPLIER_NAME_MAX, `Name must be at most ${AMC_SUPPLIER_NAME_MAX} characters.`);

export const createAmcSupplierSchema = z.object({
  name: amcSupplierName,
});

export const updateAmcSupplierSchema = z.object({
  name: amcSupplierName,
});

export const amcSupplierIdParamSchema = z.object({
  id: z.string().uuid('Invalid AMC supplier id.'),
});

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
