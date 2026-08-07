import { z } from 'zod';
/**
 * Client mirror of the server's supplier contract (server suppliers.schemas.ts). Kept in step so
 * the two validations cannot drift (CLAUDE.md: same zod shape front and back). The server validates
 * independently regardless — this is a courtesy that gives instant field feedback.
 */
export const SUPPLIERS_NAME_MAX = 255;

const suppliersName = z
  .string()
  .trim()
  .min(1, 'Name is required.')
  .max(SUPPLIERS_NAME_MAX, `Name must be at most ${SUPPLIERS_NAME_MAX} characters.`);

  const supplierEmail = z
  .string()
  .trim()
  .max(255)
  .email('Enter a valid email address.')
  .optional()
  .or(z.literal('').transform(() => undefined));
  
export const supplierFormSchema = z.object({
  name: suppliersName,
  email: supplierEmail,
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export const SUPPLIER_SORT_FIELDS = ['name', 'createdAt'] as const;
export type SupplierSortField = (typeof SUPPLIER_SORT_FIELDS)[number];
