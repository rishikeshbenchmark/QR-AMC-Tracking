/**
 * The category shape returned to the client. Built explicitly by a mapper in the service — never a
 * raw Prisma entity — so tenant/audit/soft-delete columns never leak into a response.
 */
export interface CategoryDto {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date | null;
}
