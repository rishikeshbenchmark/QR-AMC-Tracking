import type { Prisma } from '@prisma/client';

import { prisma } from '@/shared/prisma';

/**
 * The one place the product_makes table is queried. Every read filters `company_id` AND
 * `is_deleted = false`; writes take a transaction client so the mutation and its audit row commit
 * atomically. Cloned from categories.repository — the additions are the nested category select and
 * the parent filter.
 */

export type MakeListSort = 'name' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface ListParams {
  companyId: string;
  skip: number;
  take: number;
  search?: string;
  categoryId?: string;
  sort: MakeListSort;
  order: SortOrder;
}

const makeSelect = {
  id: true,
  name: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { name: true } },
} satisfies Prisma.ProductMakeSelect;

export type MakeRow = Prisma.ProductMakeGetPayload<{ select: typeof makeSelect }>;

function baseWhere(
  companyId: string,
  search?: string,
  categoryId?: string,
): Prisma.ProductMakeWhereInput {
  return {
    companyId,
    isDeleted: false,
    // SQL Server's default collation is case-insensitive, so `contains` matches regardless of case.
    ...(search ? { name: { contains: search } } : {}),
    ...(categoryId ? { categoryId } : {}),
  };
}

export async function listMakes(params: ListParams) {
  const where = baseWhere(params.companyId, params.search, params.categoryId);
  const [rows, total] = await Promise.all([
    prisma.productMake.findMany({
      where,
      select: makeSelect,
      orderBy: { [params.sort]: params.order },
      skip: params.skip,
      take: params.take,
    }),
    prisma.productMake.count({ where }),
  ]);
  return { rows, total };
}

export function findMakeById(companyId: string, id: string) {
  return prisma.productMake.findFirst({
    where: { id, companyId, isDeleted: false },
    select: makeSelect,
  });
}

/**
 * Live make with the given name in this tenant. Mirrors ux_makes_company_name, which is on
 * (company_id, name) — NOT scoped by category, so two categories cannot both hold a "Dell".
 */
export function findMakeByName(companyId: string, name: string, excludeId?: string) {
  return prisma.productMake.findFirst({
    where: {
      companyId,
      isDeleted: false,
      name,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export function createMake(
  tx: Prisma.TransactionClient,
  data: { companyId: string; categoryId: string; name: string; createdBy: string },
) {
  return tx.productMake.create({
    data,
    select: makeSelect,
  });
}

export function updateMake(
  tx: Prisma.TransactionClient,
  id: string,
  data: { name: string; categoryId: string; updatedBy: string },
) {
  return tx.productMake.update({
    where: { id },
    data: {
      name: data.name,
      categoryId: data.categoryId,
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    },
    select: makeSelect,
  });
}

export function softDeleteMake(tx: Prisma.TransactionClient, id: string, deletedBy: string) {
  return tx.productMake.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), deletedBy },
    select: { id: true },
  });
}
