/**
 * The make shape returned to the client. The parent category's id AND name travel together so the
 * table can show "Dell (Laptop)" without a second request. Built explicitly by a mapper in the
 * service — never a raw Prisma entity, never the nested relation object.
 */
export interface MakeDto {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  createdAt: Date;
  updatedAt: Date | null;
}
