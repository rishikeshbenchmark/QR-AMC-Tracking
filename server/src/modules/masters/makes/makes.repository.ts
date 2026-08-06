import type { Prisma } from '@prisma/client';

import { prisma } from '@/shared/prisma';

/**
 * The one place the product_makes table is queried. Every read filters `company_id` AND
 * `is_deleted = false` — a missing filter is a tenant-leak bug, not a cosmetic one (CLAUDE.md).
 * Writes take a transaction client so the mutation and its audit row commit atomically.
 *
 * Make-name uniqueness is per company only (ux_makes_company_name on (company_id, name)), same
 * shape as categories — unlike models, which are unique per make. Do not add categoryId to the
 * duplicate-check query below; that would be the model rule leaking into the make module.
 */

export type MakeListSort = 'name' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface ListParams {
  companyId: string;
  skip: number;
  take: number;
  search?: string;
  sort: MakeListSort;
  order: SortOrder;
  categoryId?: string;
}

/**
 * Only the columns a DTO needs — never `select *` (CLAUDE.md). The nested category select pulls
 * the parent's name in the same query (one round trip for the whole page, not one per row).
 */
const makeSelect = {
  id: true,
  name: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { name: true } },
} satisfies Prisma.ProductMakeSelect;

function baseWhere(companyId: string, search?: string, categoryId?: string): Prisma.ProductMakeWhereInput {
  return {
    companyId,
    isDeleted: false,
    // SQL Server's default collation is case-insensitive, so `contains` matches regardless of case.
    ...(search ? { name: { contains: search } } : {}),
    ...(categoryId ? { categoryId } : {}),
  };
}

/** One page of live makes plus the total for pagination meta. */
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
 * Live make with the given name in this tenant, if any. Used for the duplicate check before
 * create/update; mirrors the filtered unique index ux_makes_company_name (WHERE is_deleted = 0).
 * `excludeId` lets an update ignore the row it is editing. Company-scoped only — no categoryId,
 * because a make name is unique across the whole tenant, not per category.
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
    data: {
      companyId: data.companyId,
      categoryId: data.categoryId,
      name: data.name,
      createdBy: data.createdBy,
    },
    select: makeSelect,
  });
}

export function updateMake(
  tx: Prisma.TransactionClient,
  id: string,
  data: { categoryId: string; name: string; updatedBy: string },
) {
  return tx.productMake.update({
    where: { id },
    data: {
      categoryId: data.categoryId,
      name: data.name,
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    },
    select: makeSelect,
  });
}

/** Soft delete — sets the flag and stamps who/when. The row is never physically removed. */
export function softDeleteMake(
  tx: Prisma.TransactionClient,
  id: string,
  deletedBy: string,
) {
  return tx.productMake.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
    },
    select: { id: true },
  });
}
