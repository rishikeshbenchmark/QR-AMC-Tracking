import { z } from 'zod';

/**
 * Validation contract for the product-make master. Cloned from categories; the difference is the
 * mandatory parent category (`product_makes.category_id` is NOT NULL — a make always belongs to a
 * category). The tenant still never comes from the client.
 */
const MAKE_NAME_MAX = 150;

const makeName = z
  .string({ required_error: 'Name is required.' })
  .trim()
  .min(1, 'Name is required.')
  .max(MAKE_NAME_MAX, `Name must be at most ${MAKE_NAME_MAX} characters.`);

const categoryId = z
  .string({ required_error: 'Category is required.' })
  .uuid('Invalid category.');

export const createMakeSchema = z.object({
  name: makeName,
  categoryId,
});

/** Update carries the same shape — moving a make to a different category is allowed. */
export const updateMakeSchema = z.object({
  name: makeName,
  categoryId,
});

export const makeIdParamSchema = z.object({
  id: z.string().uuid('Invalid make id.'),
});

export const listMakesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(MAKE_NAME_MAX).optional(),
  /** Parent filter — drives the cascading make picker on the asset form. */
  categoryId: z.string().uuid('Invalid category.').optional(),
  sort: z.enum(['name', 'createdAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateMakeInput = z.infer<typeof createMakeSchema>;
export type UpdateMakeInput = z.infer<typeof updateMakeSchema>;
export type MakeIdParam = z.infer<typeof makeIdParamSchema>;
export type ListMakesQuery = z.infer<typeof listMakesQuerySchema>;
