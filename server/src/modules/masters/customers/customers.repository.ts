import type { Prisma } from '@prisma/client';

import { prisma } from '@/shared/prisma';

/**
 * The one place the product_categories table is queried. Every read filters `company_id` AND
 * `is_deleted = false` — a missing filter is a tenant-leak bug, not a cosmetic one (CLAUDE.md).
 * Writes take a transaction client so the mutation and its audit row commit atomically.
 */

export type CustomerListSort = 'name' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface ListParams {
  companyId: string;
  skip: number;
  take: number;
  search?: string;
  sort: CustomerListSort;
  order: SortOrder;
}

/** Only the columns a DTO needs — never `select *` (CLAUDE.md). */
const customerSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CustomerSelect;

function baseWhere(companyId: string, search?: string): Prisma.CustomerWhereInput {
  return {
    companyId,
    isDeleted: false,
    // SQL Server's default collation is case-insensitive, so `contains` matches regardless of case.
    ...(search ? { name: { contains: search } } : {}),
  };
}

/** One page of live customers plus the total for pagination meta. */
export async function listCustomers(params: ListParams) {
  const where = baseWhere(params.companyId, params.search);
  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      select: customerSelect,
      orderBy: { [params.sort]: params.order },
      skip: params.skip,
      take: params.take,
    }),
    prisma.customer.count({ where }),
  ]);
  return { rows, total };
}

export function findCustomerById(companyId: string, id: string) {
  return prisma.customer.findFirst({
    where: { id, companyId, isDeleted: false },
    select: customerSelect,
  });
}

/**
 * Live customer with the given name in this tenant, if any. Used for the duplicate check before
 * create/update; mirrors the filtered unique index ux_customers_company_name (WHERE is_deleted = 0).
 * `excludeId` lets an update ignore the row it is editing.
 */
export function findCustomerByName(companyId: string, name: string, excludeId?: string) {
  return prisma.customer.findFirst({
    where: {
      companyId,
      isDeleted: false,
      name,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export function createCustomer(
  tx: Prisma.TransactionClient,
  data: {
    companyId: string;
    name: string;
    email: string | null;
    createdBy: string;
  },
) {
  return tx.customer.create({
    data: {
      companyId: data.companyId,
      name: data.name,
      email: data.email,
      createdBy: data.createdBy,
    },
    select: customerSelect,
  });
}
export function updateCustomer(
  tx: Prisma.TransactionClient,
  id: string,
  data: { name: string;   email: string | null; updatedBy: string },
) {
  return tx.customer.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    },
    select: customerSelect,
  });
}

/** Soft delete — sets the flag and stamps who/when. The row is never physically removed. */
export function softDeleteCustomer(
  tx: Prisma.TransactionClient,
  id: string,
  deletedBy: string,
) {
  return tx.customer.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
    },
    select: { id: true },
  });
}
