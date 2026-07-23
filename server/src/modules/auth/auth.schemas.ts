import { z } from 'zod';

/**
 * Login input. Email is trimmed and lowercased at the boundary so casing never causes a
 * spurious "invalid credentials". Password length is checked only for presence — the real
 * strength policy lives at user-creation time, not login.
 */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
