/**
 * The make shape returned to the client. Built explicitly by a mapper in the service — never a raw
 * Prisma entity — so tenant/audit/soft-delete columns never leak into a response. Includes the
 * parent category's id and flattened name so the Makes table can render without a second request.
 */
export interface MakeDto {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  createdAt: Date;
  updatedAt: Date | null;
}
