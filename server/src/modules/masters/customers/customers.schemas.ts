import { z } from 'zod';

/**
 * Validation contract for the customer master. Same two differences from the category template as
 * suppliers: a 255-wide name and an optional email normalised from `''` to `undefined` at the
 * boundary, so the service can store `?? null` and never `''`.
 */
const CUSTOMER_NAME_MAX = 255;
const CUSTOMER_EMAIL_MAX = 255;

const customerName = z
  .string({ required_error: 'Name is required.' })
  .trim()
  .min(1, 'Name is required.')
  .max(CUSTOMER_NAME_MAX, `Name must be at most ${CUSTOMER_NAME_MAX} characters.`);

const customerEmail = z
  .string()
  .trim()
  .max(CUSTOMER_EMAIL_MAX, `Email must be at most ${CUSTOMER_EMAIL_MAX} characters.`)
  .email('Enter a valid email address.')
  .optional()
  .or(z.literal('').transform(() => undefined));

export const createCustomerSchema = z.object({
  name: customerName,
  email: customerEmail,
});

/** A PUT replaces the whole editable surface, so a blank email CLEARS the stored one. */
export const updateCustomerSchema = z.object({
  name: customerName,
  email: customerEmail,
});

export const customerIdParamSchema = z.object({
  id: z.string().uuid('Invalid customer id.'),
});

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(CUSTOMER_NAME_MAX).optional(),
  sort: z.enum(['name', 'createdAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerIdParam = z.infer<typeof customerIdParamSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
