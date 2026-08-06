import type { Prisma } from '@prisma/client';

import { prisma } from '@/shared/prisma';

/**
 * The one place the suppliers table is queried. Every read filters `company_id` AND
 * `is_deleted = false` — a missing filter is a tenant-leak bug, not a cosmetic one (CLAUDE.md).
 * Writes take a transaction client so the mutation and its audit row commit atomically.
 */

export type SupplierListSort = 'name' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface ListParams {
  companyId: string;
  skip: number;
  take: number;
  search?: string;
  sort: SupplierListSort;
  order: SortOrder;
}

/** Only the columns a DTO needs — never `select *` (CLAUDE.md). */
const supplierSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SupplierSelect;

function baseWhere(companyId: string, search?: string): Prisma.SupplierWhereInput {
  return {
    companyId,
    isDeleted: false,
    // SQL Server's default collation is case-insensitive, so `contains` matches regardless of case.
    ...(search ? { name: { contains: search } } : {}),
  };
}

/** One page of live suppliers plus the total for pagination meta. */
export async function listSuppliers(params: ListParams) {
  const where = baseWhere(params.companyId, params.search);
  const [rows, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      select: supplierSelect,
      orderBy: { [params.sort]: params.order },
      skip: params.skip,
      take: params.take,
    }),
    prisma.supplier.count({ where }),
  ]);
  return { rows, total };
}

export function findSupplierById(companyId: string, id: string) {
  return prisma.supplier.findFirst({
    where: { id, companyId, isDeleted: false },
    select: supplierSelect,
  });
}

/**
 * Live supplier with the given name in this tenant, if any. Used for the duplicate check before
 * create/update; mirrors the filtered unique index ux_suppliers_company_name (WHERE is_deleted = 0).
 * `excludeId` lets an update ignore the row it is editing.
 */
export function findSupplierByName(companyId: string, name: string, excludeId?: string) {
  return prisma.supplier.findFirst({
    where: {
      companyId,
      isDeleted: false,
      name,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export function createSupplier(
  tx: Prisma.TransactionClient,
  data: { companyId: string; name: string; email?: string; createdBy: string },
) {
  return tx.supplier.create({
    data: {
      companyId: data.companyId,
      name: data.name,
      email: data.email,
      createdBy: data.createdBy,
    },
    select: supplierSelect,
  });
}

export function updateSupplier(
  tx: Prisma.TransactionClient,
  id: string,
  data: { name: string; email?: string; updatedBy: string },
) {
  return tx.supplier.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    },
    select: supplierSelect,
  });
}

/** Soft delete — sets the flag and stamps who/when. The row is never physically removed. */
export function softDeleteSupplier(
  tx: Prisma.TransactionClient,
  id: string,
  deletedBy: string,
) {
  return tx.supplier.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
    },
    select: { id: true },
  });
}
