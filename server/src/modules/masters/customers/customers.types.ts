/**
 * The customer shape returned to the client. `email` is `string | null` — never `''`. Built
 * explicitly by a mapper in the service, never a raw Prisma entity.
 */
export interface CustomerDto {
  id: string;
  name: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}
