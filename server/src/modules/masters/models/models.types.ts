/**
 * The model shape returned to the client. Carries the whole chain — make AND category — so the
 * table and the cascading asset-form pickers need no follow-up requests. Built explicitly by a
 * mapper in the service, never a raw Prisma entity.
 */
export interface ModelDto {
  id: string;
  name: string;
  makeId: string;
  makeName: string;
  categoryId: string;
  categoryName: string;
  createdAt: Date;
  updatedAt: Date | null;
}
