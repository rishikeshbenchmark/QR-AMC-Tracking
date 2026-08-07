import { z } from 'zod';

/**
 * Validation contract for the product-model master. Cloned from makes.schemas.ts with the parent
 * swapped: every model requires a makeId (mandatory parent, settled with the HOD — see
 * docs/tasks/makes-and-models.md). The tenant is never taken from the client (it comes from the
 * JWT in the service), so companyId does not appear here.
 */
const MODEL_NAME_MAX = 150;

const modelName = z
  .string({ required_error: 'Name is required.' })
  .trim()
  .min(1, 'Name is required.')
  .max(MODEL_NAME_MAX, `Name must be at most ${MODEL_NAME_MAX} characters.`);

const makeIdField = z.string({ required_error: 'Make is required.' }).uuid('Invalid make id.');

export const createModelSchema = z.object({
  name: modelName,
  makeId: makeIdField,
});

/** Update replaces the whole editable surface — moving a model to a different make is allowed. */
export const updateModelSchema = z.object({
  name: modelName,
  makeId: makeIdField,
});

export const modelIdParamSchema = z.object({
  id: z.string().uuid('Invalid model id.'),
});

/** Whitelisted list controls, plus an optional parent filter. Unknown sort/order are rejected. */
export const listModelsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(MODEL_NAME_MAX).optional(),
  sort: z.enum(['name', 'createdAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  makeId: z.string().uuid().optional(),
});

export type CreateModelInput = z.infer<typeof createModelSchema>;
export type UpdateModelInput = z.infer<typeof updateModelSchema>;
export type ModelIdParam = z.infer<typeof modelIdParamSchema>;
export type ListModelsQuery = z.infer<typeof listModelsQuerySchema>;
