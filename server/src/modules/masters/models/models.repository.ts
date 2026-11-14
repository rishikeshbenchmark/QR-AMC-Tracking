import type { Prisma } from '@prisma/client';

import { prisma } from '@/shared/prisma';

/**
 * The one place the product_models table is queried. Every read filters `company_id` AND
 * `is_deleted = false`; writes take a transaction client. The nested select reaches through the make
 * to the category so the DTO can carry the whole chain without a second query.
 */

export type ModelListSort = 'name' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface ListParams {
  companyId: string;
  skip: number;
  take: number;
  search?: string;
  makeId?: string;
  categoryId?: string;
  sort: ModelListSort;
  order: SortOrder;
}

const modelSelect = {
  id: true,
  name: true,
  makeId: true,
  createdAt: true,
  updatedAt: true,
  make: {
    select: {
      name: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  },
} satisfies Prisma.ProductModelSelect;

export type ModelRow = Prisma.ProductModelGetPayload<{ select: typeof modelSelect }>;

function baseWhere(params: ListParams): Prisma.ProductModelWhereInput {
  return {
    companyId: params.companyId,
    isDeleted: false,
    // SQL Server's default collation is case-insensitive, so `contains` matches regardless of case.
    ...(params.search ? { name: { contains: params.search } } : {}),
    ...(params.makeId ? { makeId: params.makeId } : {}),
    ...(params.categoryId ? { make: { categoryId: params.categoryId, isDeleted: false } } : {}),
  };
}

export async function listModels(params: ListParams) {
  const where = baseWhere(params);
  const [rows, total] = await Promise.all([
    prisma.productModel.findMany({
      where,
      select: modelSelect,
      orderBy: { [params.sort]: params.order },
      skip: params.skip,
      take: params.take,
    }),
    prisma.productModel.count({ where }),
  ]);
  return { rows, total };
}

export function findModelById(companyId: string, id: string) {
  return prisma.productModel.findFirst({
    where: { id, companyId, isDeleted: false },
    select: modelSelect,
  });
}

/**
 * Live model with this name UNDER THIS MAKE. Mirrors ux_models_company_make_name, which includes
 * make_id — unlike every other master, the same model name is legal under a different make.
 */
export function findModelByName(
  companyId: string,
  makeId: string,
  name: string,
  excludeId?: string,
) {
  return prisma.productModel.findFirst({
    where: {
      companyId,
      makeId,
      isDeleted: false,
      name,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export function createModel(
  tx: Prisma.TransactionClient,
  data: { companyId: string; makeId: string; name: string; createdBy: string },
) {
  return tx.productModel.create({
    data,
    select: modelSelect,
  });
}

export function updateModel(
  tx: Prisma.TransactionClient,
  id: string,
  data: { name: string; makeId: string; updatedBy: string },
) {
  return tx.productModel.update({
    where: { id },
    data: {
      name: data.name,
      makeId: data.makeId,
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    },
    select: modelSelect,
  });
}

export function softDeleteModel(tx: Prisma.TransactionClient, id: string, deletedBy: string) {
  return tx.productModel.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), deletedBy },
    select: { id: true },
  });
}
