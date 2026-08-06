/**
 * The supplier shape returned to the client. Built explicitly by a mapper in the service — never a
 * raw Prisma entity — so tenant/audit/soft-delete columns never leak into a response.
 */
export interface SupplierDto {
  id: string;
  name: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}
