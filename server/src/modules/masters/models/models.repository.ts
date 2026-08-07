import type { Prisma } from '@prisma/client';

import { prisma } from '@/shared/prisma';

/**
 * The one place the product_models table is queried. Every read filters `company_id` AND
 * `is_deleted = false` — a missing filter is a tenant-leak bug, not a cosmetic one (CLAUDE.md).
 * Writes take a transaction client so the mutation and its audit row commit atomically.
 *
 * IMPORTANT — this is the one place this module differs from makes in a way that is easy to get
 * wrong: model-name uniqueness is per MAKE, not per company (ux_models_company_make_name on
 * (company_id, make_id, name)). "Latitude 5550" under Dell and "Latitude 5550" under HP are both
 * legal. findModelByName below takes makeId as a required argument for exactly this reason — do
 * not copy the make/category duplicate-check shape (companyId, name) here.
 */

export type ModelListSort = 'name' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface ListParams {
  companyId: string;
  skip: number;
  take: number;
  search?: string;
  sort: ModelListSort;
  order: SortOrder;
  makeId?: string;
}

/**
 * Only the columns a DTO needs — never `select *` (CLAUDE.md). The nested make select pulls the
 * parent's name in the same query (one round trip for the whole page, not one per row).
 */
const modelSelect = {
  id: true,
  name: true,
  makeId: true,
  createdAt: true,
  updatedAt: true,
  make: { select: { name: true } },
} satisfies Prisma.ProductModelSelect;

function baseWhere(companyId: string, search?: string, makeId?: string): Prisma.ProductModelWhereInput {
  return {
    companyId,
    isDeleted: false,
    // SQL Server's default collation is case-insensitive, so `contains` matches regardless of case.
    ...(search ? { name: { contains: search } } : {}),
    ...(makeId ? { makeId } : {}),
  };
}

/** One page of live models plus the total for pagination meta. */
export async function listModels(params: ListParams) {
  const where = baseWhere(params.companyId, params.search, params.makeId);
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
 * Live model with the given name, WITHIN THE GIVEN MAKE, in this tenant, if any. Used for the
 * duplicate check before create/update; mirrors the filtered unique index
 * ux_models_company_make_name (WHERE is_deleted = 0). `makeId` is required, not optional — a model
 * name collision only matters within its own make. `excludeId` lets an update ignore the row it is
 * editing.
 */
export function findModelByName(companyId: string, makeId: string, name: string, excludeId?: string) {
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
    data: {
      companyId: data.companyId,
      makeId: data.makeId,
      name: data.name,
      createdBy: data.createdBy,
    },
    select: modelSelect,
  });
}

export function updateModel(
  tx: Prisma.TransactionClient,
  id: string,
  data: { makeId: string; name: string; updatedBy: string },
) {
  return tx.productModel.update({
    where: { id },
    data: {
      makeId: data.makeId,
      name: data.name,
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    },
    select: modelSelect,
  });
}

/** Soft delete — sets the flag and stamps who/when. The row is never physically removed. */
export function softDeleteModel(
  tx: Prisma.TransactionClient,
  id: string,
  deletedBy: string,
) {
  return tx.productModel.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
    },
    select: { id: true },
  });
}
