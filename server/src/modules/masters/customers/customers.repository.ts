import type { Prisma } from '@prisma/client';

import { prisma } from '@/shared/prisma';

/**
 * The one place the customers table is queried. Every read filters `company_id` AND
 * `is_deleted = false`; writes take a transaction client. `email` is written as `string | null`,
 * never `''` — the schema layer has already normalised it.
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

const customerSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CustomerSelect;

export type CustomerRow = Prisma.CustomerGetPayload<{ select: typeof customerSelect }>;

function baseWhere(companyId: string, search?: string): Prisma.CustomerWhereInput {
  return {
    companyId,
    isDeleted: false,
    // SQL Server's default collation is case-insensitive, so `contains` matches regardless of case.
    ...(search ? { name: { contains: search } } : {}),
  };
}

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

/** Mirrors ux_customers_company_name — the index covers name only, so emails may repeat. */
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
  data: { companyId: string; name: string; email: string | null; createdBy: string },
) {
  return tx.customer.create({
    data,
    select: customerSelect,
  });
}

export function updateCustomer(
  tx: Prisma.TransactionClient,
  id: string,
  data: { name: string; email: string | null; updatedBy: string },
) {
  return tx.customer.update({
    where: { id },
    data: {
      name: data.name,
      // Explicit null, not `undefined` — Prisma reads undefined as "leave it alone", which would
      // stop a cleared email from actually clearing.
      email: data.email,
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    },
    select: customerSelect,
  });
}

export function softDeleteCustomer(tx: Prisma.TransactionClient, id: string, deletedBy: string) {
  return tx.customer.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), deletedBy },
    select: { id: true },
  });
}
