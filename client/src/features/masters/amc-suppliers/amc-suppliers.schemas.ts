import { z } from 'zod';

/**
 * Client mirror of the server's AMC Supplier contract (server amc-suppliers.schemas.ts).
 * Kept in step so the two validations cannot drift (CLAUDE.md: same zod shape front and back).
 */
export const AMC_SUPPLIER_NAME_MAX = 255;

const amcSupplierName = z
  .string()
  .trim()
  .min(1, 'Name is required.')
  .max(
    AMC_SUPPLIER_NAME_MAX,
    `Name must be at most ${AMC_SUPPLIER_NAME_MAX} characters.`,
  );

export const amcSupplierFormSchema = z.object({
  name: amcSupplierName,
});

export type AmcSupplierFormValues = z.infer<typeof amcSupplierFormSchema>;

export const AMC_SUPPLIER_SORT_FIELDS = ['name', 'createdAt'] as const;

export type AmcSupplierSortField =
  (typeof AMC_SUPPLIER_SORT_FIELDS)[number];