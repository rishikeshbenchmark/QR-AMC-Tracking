import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { AUDIT_ACTION, diffFields, writeAuditLog } from '@/shared/audit';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { prisma } from '@/shared/prisma';

import * as customerRepository from './customers.repository';
import type { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from './customers.schemas';
import type { CustomerDto } from './customers.types';

/** Audit entity_type for this master. Interns cloning this file change this one string. */
const ENTITY_TYPE = 'customer';

interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

function toCustomerDto(row: CustomerRow): CustomerDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface PaginatedCustomers {
  data: CustomerDto[];
  meta: { page: number; limit: number; total: number };
}

export async function listCustomers(
  user: AuthenticatedUser,
  query: ListCustomersQuery,
): Promise<PaginatedCustomers> {
  const { rows, total } = await customerRepository.listCustomers({
    companyId: user.companyId,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    search: query.search,
    sort: query.sort,
    order: query.order,
  });

  return {
    data: rows.map(toCustomerDto),
    meta: { page: query.page, limit: query.limit, total },
  };
}

export async function getCustomer(user: AuthenticatedUser, id: string): Promise<CustomerDto> {
  const row = await customerRepository.findCustomerById(user.companyId, id);
  if (!row) {
    // A row in another tenant is a 404, never a 403 — don't confirm it exists (CLAUDE.md security).
    throw AppError.notFound('Customer not found.');
  }
  return toCustomerDto(row);
}

/**
 * Create a customer (also the on-the-fly create path used by <MasterSelect>). The duplicate check
 * returns 409 before hitting the DB; the filtered unique index is the backstop if two requests race.
 * The insert and its audit row share one transaction.
 */
export async function createCustomer(
  user: AuthenticatedUser,
  input: CreateCustomerInput,
): Promise<CustomerDto> {
  const existing = await customerRepository.findCustomerByName(user.companyId, input.name);
  if (existing) {
    throw AppError.conflict('CUSTOMER_NAME_TAKEN', `A customer named "${input.name}" already exists.`);
  }

  const created = await prisma.$transaction(async (tx) => {
    const row = await customerRepository.createCustomer(tx, {
      companyId: user.companyId,
      name: input.name,
      email: input.email ?? null,
      createdBy: user.userId,
    });
    await writeAuditLog(tx, {
      companyId: user.companyId,
      entityType: ENTITY_TYPE,
      entityId: row.id,
      action: AUDIT_ACTION.CREATE,
      newValue: row.name,
      changedBy: user.userId,
    });
    return row;
  });

  logger.info({ companyId: user.companyId, customerId: created.id, userId: user.userId }, 'Customer created');
  return toCustomerDto(created);
}

export async function updateCustomer(
  user: AuthenticatedUser,
  id: string,
  input: UpdateCustomerInput,
): Promise<CustomerDto> {
  const current = await customerRepository.findCustomerById(user.companyId, id);
  if (!current) {
    throw AppError.notFound('Customer not found.');
  }

  const duplicate = await customerRepository.findCustomerByName(user.companyId, input.name, id);
  if (duplicate) {
    throw AppError.conflict('CUSTOMER_NAME_TAKEN', `A customer named "${input.name}" already exists.`);
  }

  const changes = diffFields(current, { ...current, name: input.name, email: input.email ?? null }, ['name', 'email']);
  if (changes.length === 0) {
    // Nothing actually changed — return the current state without writing a no-op audit row.
    return toCustomerDto(current);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await customerRepository.updateCustomer(tx, id,
       {
      name: input.name,
      email: input.email ?? null,
      updatedBy: user.userId,
      });
    await writeAuditLog(
      tx,
      changes.map((change) => ({
        companyId: user.companyId,
        entityType: ENTITY_TYPE,
        entityId: id,
        action: AUDIT_ACTION.UPDATE,
        fieldName: change.fieldName,
        oldValue: change.oldValue,
        newValue: change.newValue,
        changedBy: user.userId,
      })),
    );
    return row;
  });

  logger.info({ companyId: user.companyId, customerId: id, userId: user.userId }, 'Customer updated');
  return toCustomerDto(updated);
}

export async function deleteCustomer(user: AuthenticatedUser, id: string): Promise<void> {
  const current = await customerRepository.findCustomerById(user.companyId, id);
  if (!current) {
    throw AppError.notFound('Customer not found.');
  }

  await prisma.$transaction(async (tx) => {
    await customerRepository.softDeleteCustomer(tx, id, user.userId);
    await writeAuditLog(tx, {
      companyId: user.companyId,
      entityType: ENTITY_TYPE,
      entityId: id,
      action: AUDIT_ACTION.DELETE,
      oldValue: current.name,
      changedBy: user.userId,
    });
  });

  logger.info({ companyId: user.companyId, customerId: id, userId: user.userId }, 'Customer deleted');
}
