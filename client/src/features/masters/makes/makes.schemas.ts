import { z } from 'zod';

/**
 * Client mirror of the server's make contract (server makes.schemas.ts). Kept in step so the two
 * validations cannot drift (CLAUDE.md: same zod shape front and back). The server validates
 * independently regardless — this is a courtesy that gives instant field feedback.
 */
export const MAKE_NAME_MAX = 150;

const makeName = z
  .string()
  .trim()
  .min(1, 'Name is required.')
  .max(MAKE_NAME_MAX, `Name must be at most ${MAKE_NAME_MAX} characters.`);

const categoryIdField = z.string().uuid('Category is required.');

export const makeFormSchema = z.object({
  name: makeName,
  categoryId: categoryIdField,
});

export type MakeFormValues = z.infer<typeof makeFormSchema>;

export const MAKE_SORT_FIELDS = ['name', 'createdAt'] as const;
export type MakeSortField = (typeof MAKE_SORT_FIELDS)[number];
