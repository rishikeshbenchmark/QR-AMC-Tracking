import { z } from 'zod';

/**
 * Validation contract for the supplier master. Two differences from the category template: the name
 * column is 255 wide, and there is an optional email.
 *
 * The email is the fiddly bit. An empty text input submits `''`, which is neither a valid address
 * nor the same thing as "not provided". It is normalised to `undefined` here so the rest of the code
 * only ever sees a string or `undefined`, and the service stores `?? null` — `null` is the correct
 * "no email", never `''`.
 */
const SUPPLIER_NAME_MAX = 255;
const SUPPLIER_EMAIL_MAX = 255;

const supplierName = z
  .string({ required_error: 'Name is required.' })
  .trim()
  .min(1, 'Name is required.')
  .max(SUPPLIER_NAME_MAX, `Name must be at most ${SUPPLIER_NAME_MAX} characters.`);

const supplierEmail = z
  .string()
  .trim()
  .max(SUPPLIER_EMAIL_MAX, `Email must be at most ${SUPPLIER_EMAIL_MAX} characters.`)
  .email('Enter a valid email address.')
  .optional()
  .or(z.literal('').transform(() => undefined));

export const createSupplierSchema = z.object({
  name: supplierName,
  email: supplierEmail,
});

/**
 * Update replaces the whole editable surface, so an omitted or blank email CLEARS the stored one.
 * That is deliberate: a PUT is not a partial patch, and "I removed the address" must persist.
 */
export const updateSupplierSchema = z.object({
  name: supplierName,
  email: supplierEmail,
});

export const supplierIdParamSchema = z.object({
  id: z.string().uuid('Invalid supplier id.'),
});

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
