import { z } from 'zod';

/**
 * Client mirror of the server's model contract (server models.schemas.ts). Kept in step so the two
 * validations cannot drift (CLAUDE.md: same zod shape front and back). The server validates
 * independently regardless — this is a courtesy that gives instant field feedback.
 */
export const MODEL_NAME_MAX = 150;

const modelName = z
  .string()
  .trim()
  .min(1, 'Name is required.')
  .max(MODEL_NAME_MAX, `Name must be at most ${MODEL_NAME_MAX} characters.`);

const makeIdField = z.string().uuid('Make is required.');

export const modelFormSchema = z.object({
  name: modelName,
  makeId: makeIdField,
});

export type ModelFormValues = z.infer<typeof modelFormSchema>;

export const MODEL_SORT_FIELDS = ['name', 'createdAt'] as const;
export type ModelSortField = (typeof MODEL_SORT_FIELDS)[number];