import type { Prisma } from '@prisma/client';

import { prisma } from '@/shared/prisma';

/**
 * The one place the product_categories table is queried. Every read filters `company_id` AND
 * `is_deleted = false` — a missing filter is a tenant-leak bug, not a cosmetic one (CLAUDE.md).
 * Writes take a transaction client so the mutation and its audit row commit atomically.
 */

export type CategoryListSort = 'name' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface ListParams {
  companyId: string;
  skip: number;
  take: number;
  search?: string;
  sort: CategoryListSort;
  order: SortOrder;
}

/** Only the columns a DTO needs — never `select *` (CLAUDE.md). */
const categorySelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductCategorySelect;

function baseWhere(companyId: string, search?: string): Prisma.ProductCategoryWhereInput {
  return {
    companyId,
    isDeleted: false,
    // SQL Server's default collation is case-insensitive, so `contains` matches regardless of case.
    ...(search ? { name: { contains: search } } : {}),
  };
}

/** One page of live categories plus the total for pagination meta. */
export async function listCategories(params: ListParams) {
  const where = baseWhere(params.companyId, params.search);
  const [rows, total] = await Promise.all([
    prisma.productCategory.findMany({
      where,
      select: categorySelect,
      orderBy: { [params.sort]: params.order },
      skip: params.skip,
      take: params.take,
    }),
    prisma.productCategory.count({ where }),
  ]);
  return { rows, total };
}

export function findCategoryById(companyId: string, id: string) {
  return prisma.productCategory.findFirst({
    where: { id, companyId, isDeleted: false },
    select: categorySelect,
  });
}

/**
 * Live category with the given name in this tenant, if any. Used for the duplicate check before
 * create/update; mirrors the filtered unique index ux_categories_company_name (WHERE is_deleted = 0).
 * `excludeId` lets an update ignore the row it is editing.
 */
export function findCategoryByName(companyId: string, name: string, excludeId?: string) {
  return prisma.productCategory.findFirst({
    where: {
      companyId,
      isDeleted: false,
      name,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export function createCategory(
  tx: Prisma.TransactionClient,
  data: { companyId: string; name: string; createdBy: string },
) {
  return tx.productCategory.create({
    data: {
      companyId: data.companyId,
      name: data.name,
      createdBy: data.createdBy,
    },
    select: categorySelect,
  });
}

export function updateCategory(
  tx: Prisma.TransactionClient,
  id: string,
  data: { name: string; updatedBy: string },
) {
  return tx.productCategory.update({
    where: { id },
    data: {
      name: data.name,
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    },
    select: categorySelect,
  });
}

/** Soft delete — sets the flag and stamps who/when. The row is never physically removed. */
export function softDeleteCategory(
  tx: Prisma.TransactionClient,
  id: string,
  deletedBy: string,
) {
  return tx.productCategory.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
    },
    select: { id: true },
  });
}
