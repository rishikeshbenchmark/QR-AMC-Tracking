import type { Prisma } from '@prisma/client';

import { prisma } from '@/shared/prisma';

/**
 * The one place the suppliers table is queried. Every read filters `company_id` AND
 * `is_deleted = false`; writes take a transaction client. `email` is written as `string | null`,
 * never `''` — the schema layer has already normalised it.
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

const supplierSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SupplierSelect;

export type SupplierRow = Prisma.SupplierGetPayload<{ select: typeof supplierSelect }>;

function baseWhere(companyId: string, search?: string): Prisma.SupplierWhereInput {
  return {
    companyId,
    isDeleted: false,
    // SQL Server's default collation is case-insensitive, so `contains` matches regardless of case.
    ...(search ? { name: { contains: search } } : {}),
  };
}

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
 * Live supplier with the given name. Mirrors ux_suppliers_company_name — the index covers name only,
 * so two suppliers may legitimately share an email address.
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
  data: { companyId: string; name: string; email: string | null; createdBy: string },
) {
  return tx.supplier.create({
    data,
    select: supplierSelect,
  });
}

export function updateSupplier(
  tx: Prisma.TransactionClient,
  id: string,
  data: { name: string; email: string | null; updatedBy: string },
) {
  return tx.supplier.update({
    where: { id },
    data: {
      name: data.name,
      // Explicit null, not `undefined` — Prisma would treat undefined as "leave it alone", which is
      // exactly the bug that stops a cleared email from clearing.
      email: data.email,
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    },
    select: supplierSelect,
  });
}

export function softDeleteSupplier(tx: Prisma.TransactionClient, id: string, deletedBy: string) {
  return tx.supplier.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), deletedBy },
    select: { id: true },
  });
}
