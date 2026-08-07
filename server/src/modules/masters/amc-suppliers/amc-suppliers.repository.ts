import type { Prisma } from '@prisma/client';

import { prisma } from '@/shared/prisma';

/**
 * The one place the AMC suppliers table is queried. Every read filters `company_id` AND
 * `is_deleted = false` — a missing filter is a tenant-leak bug, not a cosmetic one (CLAUDE.md).
 * Writes take a transaction client so the mutation and its audit row commit atomically.
 */

export type AmcSupplierListSort = 'name' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface ListParams {
  companyId: string;
  skip: number;
  take: number;
  search?: string;
  sort: AmcSupplierListSort;
  order: SortOrder;
}

/** Only the columns a DTO needs — never `select *` (CLAUDE.md). */
const amcSupplierSelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AmcSupplierSelect;

function baseWhere(
  companyId: string,
  search?: string,
): Prisma.AmcSupplierWhereInput {
  return {
    companyId,
    isDeleted: false,
    ...(search ? { name: { contains: search } } : {}),
  };
}

/** One page of live AMC suppliers plus the total for pagination meta. */
export async function listAmcSuppliers(params: ListParams) {
  const where = baseWhere(params.companyId, params.search);

  const [rows, total] = await Promise.all([
    prisma.amcSupplier.findMany({
      where,
      select: amcSupplierSelect,
      orderBy: { [params.sort]: params.order },
      skip: params.skip,
      take: params.take,
    }),
    prisma.amcSupplier.count({ where }),
  ]);

  return { rows, total };
}

export function findAmcSupplierById(companyId: string, id: string) {
  return prisma.amcSupplier.findFirst({
    where: { id, companyId, isDeleted: false },
    select: amcSupplierSelect,
  });
}

/**
 * Live AMC supplier with the given name in this tenant, if any. Used for the duplicate check
 * before create/update.
 */
export function findAmcSupplierByName(
  companyId: string,
  name: string,
  excludeId?: string,
) {
  return prisma.amcSupplier.findFirst({
    where: {
      companyId,
      isDeleted: false,
      name,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export function createAmcSupplier(
  tx: Prisma.TransactionClient,
  data: {
    companyId: string;
    name: string;
    createdBy: string;
  },
) {
  return tx.amcSupplier.create({
    data: {
      companyId: data.companyId,
      name: data.name,
      createdBy: data.createdBy,
    },
    select: amcSupplierSelect,
  });
}

export function updateAmcSupplier(
  tx: Prisma.TransactionClient,
  id: string,
  data: {
    name: string;
    updatedBy: string;
  },
) {
  return tx.amcSupplier.update({
    where: { id },
    data: {
      name: data.name,
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    },
    select: amcSupplierSelect,
  });
}

/** Soft delete — sets the flag and stamps who/when. The row is never physically removed. */
export function softDeleteAmcSupplier(
  tx: Prisma.TransactionClient,
  id: string,
  deletedBy: string,
) {
  return tx.amcSupplier.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
    },
    select: { id: true },
  });
}