import { z } from 'zod';

/**
 * Client mirror of the server's customer contract (server customers.schemas.ts). Kept in step so
 * the two validations cannot drift (CLAUDE.md: same zod shape front and back). The server validates
 * independently regardless — this is a courtesy that gives instant field feedback.
 */
export const CUSTOMER_NAME_MAX = 255;

const customerName = z
  .string()
  .trim()
  .min(1, 'Name is required.')
  .max(CUSTOMER_NAME_MAX, `Name must be at most ${CUSTOMER_NAME_MAX} characters.`);

// Email is optional — empty string is normalized to undefined so the server stores NULL, not "".
const customerEmail = z
  .string()
  .trim()
  .email('Enter a valid email address.')
  .optional()
  .or(z.literal(''))
  .transform((value) => (value ? value : undefined));

export const customerFormSchema = z.object({
  name: customerName,
  email: customerEmail,
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export const CUSTOMER_SORT_FIELDS = ['name', 'email', 'createdAt'] as const;
export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];