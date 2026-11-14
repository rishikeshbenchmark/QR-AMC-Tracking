import { z } from 'zod';

/**
 * Validation contract for the product-model master. Like makes, but the parent is a make and — the
 * one thing that genuinely differs from every other master — uniqueness is scoped BY that parent
 * (ux_models_company_make_name), so "Latitude 5550" may exist under two different makes.
 */
const MODEL_NAME_MAX = 150;

const modelName = z
  .string({ required_error: 'Name is required.' })
  .trim()
  .min(1, 'Name is required.')
  .max(MODEL_NAME_MAX, `Name must be at most ${MODEL_NAME_MAX} characters.`);

const makeId = z.string({ required_error: 'Make is required.' }).uuid('Invalid make.');

export const createModelSchema = z.object({
  name: modelName,
  makeId,
});

/** Update carries the same shape — moving a model to a different make is allowed. */
export const updateModelSchema = z.object({
  name: modelName,
  makeId,
});

export const modelIdParamSchema = z.object({
  id: z.string().uuid('Invalid model id.'),
});

export const listModelsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(MODEL_NAME_MAX).optional(),
  /** Parent filter — drives the cascading model picker on the asset form. */
  makeId: z.string().uuid('Invalid make.').optional(),
  /** Grandparent filter: every model under a category, for the same cascade one level up. */
  categoryId: z.string().uuid('Invalid category.').optional(),
  sort: z.enum(['name', 'createdAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateModelInput = z.infer<typeof createModelSchema>;
export type UpdateModelInput = z.infer<typeof updateModelSchema>;
export type ModelIdParam = z.infer<typeof modelIdParamSchema>;
export type ListModelsQuery = z.infer<typeof listModelsQuerySchema>;
