import { z } from 'zod';

/**
 * Validation contract for the product-category master — the reference shape every other master
 * (make/model/supplier/customer) is cloned from. Name is trimmed at the boundary so trailing
 * whitespace never creates a "different" duplicate, and the tenant is never taken from the client
 * (it comes from the JWT in the service), so it does not appear here.
 */
const CUSTOMER_NAME_MAX = 255;

const customerName = z
  .string({ required_error: 'Name is required.' })
  .trim()
  .min(1, 'Name is required.')
  .max(CUSTOMER_NAME_MAX, `Name must be at most ${CUSTOMER_NAME_MAX} characters.`);

  const customerEmail = z
  .string()
  .trim()
  .max(255)
  .email('Enter a valid email address.')
  .optional()
  .or(z.literal('').transform(() => undefined));
export const createCustomerSchema = z.object({
  name: customerName,
  email: customerEmail, 
});

/** Update replaces the whole editable surface — for a customer that is just the name. */
export const updateCustomerSchema = z.object({
  name: customerName,
  email: customerEmail,
});

export const customerIdParamSchema = z.object({
  id: z.string().uuid('Invalid customer id.'),
});

/** Whitelisted list controls. Unknown sort/order values are rejected, never passed to the query. */
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
