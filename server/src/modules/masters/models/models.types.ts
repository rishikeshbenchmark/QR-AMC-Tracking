/**
 * The model shape returned to the client. Built explicitly by a mapper in the service — never a raw
 * Prisma entity — so tenant/audit/soft-delete columns never leak into a response. Includes the
 * parent make's id and flattened name so the Models table can render without a second request.
 */
export interface ModelDto {
  id: string;
  name: string;
  makeId: string;
  makeName: string;
  createdAt: Date;
  updatedAt: Date | null;
}
