import { z } from 'zod';

/**
 * Client mirror of the server's category contract (server categories.schemas.ts). Kept in step so
 * the two validations cannot drift (CLAUDE.md: same zod shape front and back). The server validates
 * independently regardless — this is a courtesy that gives instant field feedback.
 */
export const CATEGORY_NAME_MAX = 150;

const categoryName = z
  .string()
  .trim()
  .min(1, 'Name is required.')
  .max(CATEGORY_NAME_MAX, `Name must be at most ${CATEGORY_NAME_MAX} characters.`);

export const categoryFormSchema = z.object({
  name: categoryName,
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const CATEGORY_SORT_FIELDS = ['name', 'createdAt'] as const;
export type CategorySortField = (typeof CATEGORY_SORT_FIELDS)[number];
