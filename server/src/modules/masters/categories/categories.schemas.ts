import { z } from 'zod';

/**
 * Validation contract for the product-category master — the reference shape every other master
 * (make/model/supplier/customer) is cloned from. Name is trimmed at the boundary so trailing
 * whitespace never creates a "different" duplicate, and the tenant is never taken from the client
 * (it comes from the JWT in the service), so it does not appear here.
 */
const CATEGORY_NAME_MAX = 150;

const categoryName = z
  .string({ required_error: 'Name is required.' })
  .trim()
  .min(1, 'Name is required.')
  .max(CATEGORY_NAME_MAX, `Name must be at most ${CATEGORY_NAME_MAX} characters.`);

export const createCategorySchema = z.object({
  name: categoryName,
});

/** Update replaces the whole editable surface — for a category that is just the name. */
export const updateCategorySchema = z.object({
  name: categoryName,
});

export const categoryIdParamSchema = z.object({
  id: z.string().uuid('Invalid category id.'),
});

/** Whitelisted list controls. Unknown sort/order values are rejected, never passed to the query. */
export const listCategoriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(CATEGORY_NAME_MAX).optional(),
  sort: z.enum(['name', 'createdAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryIdParam = z.infer<typeof categoryIdParamSchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
