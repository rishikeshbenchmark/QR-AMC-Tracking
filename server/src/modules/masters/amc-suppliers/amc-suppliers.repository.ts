import type { Prisma } from '@prisma/client';

import { prisma } from '@/shared/prisma';

/**
 * The one place the amc_suppliers table is queried. Every read filters `company_id` AND
 * `is_deleted = false`; writes take a transaction client so the mutation and its audit row commit
 * atomically.
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

const amcSupplierSelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AmcSupplierSelect;

export type AmcSupplierRow = Prisma.AmcSupplierGetPayload<{ select: typeof amcSupplierSelect }>;

function baseWhere(companyId: string, search?: string): Prisma.AmcSupplierWhereInput {
  return {
    companyId,
    isDeleted: false,
    // SQL Server's default collation is case-insensitive, so `contains` matches regardless of case.
    ...(search ? { name: { contains: search } } : {}),
  };
}

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

/** Mirrors the filtered unique index ux_amc_suppliers_company_name (WHERE is_deleted = 0). */
export function findAmcSupplierByName(companyId: string, name: string, excludeId?: string) {
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
  data: { companyId: string; name: string; createdBy: string },
) {
  return tx.amcSupplier.create({
    data,
    select: amcSupplierSelect,
  });
}

export function updateAmcSupplier(
  tx: Prisma.TransactionClient,
  id: string,
  data: { name: string; updatedBy: string },
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

export function softDeleteAmcSupplier(
  tx: Prisma.TransactionClient,
  id: string,
  deletedBy: string,
) {
  return tx.amcSupplier.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), deletedBy },
    select: { id: true },
  });
}
