import { z } from 'zod';

/**
 * Validation contract for the product-make master. Cloned from categories.schemas.ts with one
 * addition: every make requires a categoryId (mandatory parent, settled with the HOD — see
 * docs/tasks/makes-and-models.md). The tenant is never taken from the client (it comes from the
 * JWT in the service), so companyId does not appear here.
 */
const MAKE_NAME_MAX = 150;

const makeName = z
  .string({ required_error: 'Name is required.' })
  .trim()
  .min(1, 'Name is required.')
  .max(MAKE_NAME_MAX, `Name must be at most ${MAKE_NAME_MAX} characters.`);

const categoryIdField = z.string({ required_error: 'Category is required.' }).uuid('Invalid category id.');

export const createMakeSchema = z.object({
  name: makeName,
  categoryId: categoryIdField,
});

/** Update replaces the whole editable surface — moving a make to a different category is allowed. */
export const updateMakeSchema = z.object({
  name: makeName,
  categoryId: categoryIdField,
});

export const makeIdParamSchema = z.object({
  id: z.string().uuid('Invalid make id.'),
});

/** Whitelisted list controls, plus an optional parent filter. Unknown sort/order are rejected. */
export const listMakesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(MAKE_NAME_MAX).optional(),
  sort: z.enum(['name', 'createdAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  categoryId: z.string().uuid().optional(),
});

export type CreateMakeInput = z.infer<typeof createMakeSchema>;
export type UpdateMakeInput = z.infer<typeof updateMakeSchema>;
export type MakeIdParam = z.infer<typeof makeIdParamSchema>;
export type ListMakesQuery = z.infer<typeof listMakesQuerySchema>;
