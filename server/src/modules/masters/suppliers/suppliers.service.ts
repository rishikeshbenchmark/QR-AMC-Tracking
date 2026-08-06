import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { AUDIT_ACTION, diffFields, writeAuditLog } from '@/shared/audit';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { prisma } from '@/shared/prisma';

import * as suppliersRepository from './suppliers.repository';
import type { CreateSupplierInput, ListSuppliersQuery, UpdateSupplierInput, } from './suppliers.schemas'; import type { SupplierDto } from './suppliers.types';

/** Audit entity_type for this master. Interns cloning this file change this one string. */
const ENTITY_TYPE = 'supplier';

interface SupplierRow {
  id: string;
  name: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

function toSupplierDto(row: SupplierRow): SupplierDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface PaginatedSuppliers {
  data: SupplierDto[];
  meta: { page: number; limit: number; total: number };
}

export async function listSuppliers(
  user: AuthenticatedUser,
  query: ListSuppliersQuery,
): Promise<PaginatedSuppliers> {
  const { rows, total } = await suppliersRepository.listSuppliers({
    companyId: user.companyId,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    search: query.search,
    sort: query.sort,
    order: query.order,
  });

  return {
    data: rows.map(toSupplierDto),
    meta: { page: query.page, limit: query.limit, total },
  };
}

export async function getSupplier(user: AuthenticatedUser, id: string): Promise<SupplierDto> {
  const row = await suppliersRepository.findSupplierById(user.companyId, id);
  if (!row) {
    // A row in another tenant is a 404, never a 403 — don't confirm it exists (CLAUDE.md security).
    throw AppError.notFound('Supplier not found.');
  }
  return toSupplierDto(row);
}

/**
 * Create a supplier (also the on-the-fly create path used by <MasterSelect>). The duplicate check
 * returns 409 before hitting the DB; the filtered unique index is the backstop if two requests race.
 * The insert and its audit row share one transaction.
 */
export async function createSupplier(
  user: AuthenticatedUser,
  input: CreateSupplierInput,
): Promise<SupplierDto> {
  const existing = await suppliersRepository.findSupplierByName(user.companyId, input.name);
  if (existing) {
    throw AppError.conflict('SUPPLIER_NAME_TAKEN', `A supplier named "${input.name}" already exists.`);
  }

  const created = await prisma.$transaction(async (tx) => {
    const row = await suppliersRepository.createSupplier(tx, {
      companyId: user.companyId,
      name: input.name,
      email: input.email,
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

  logger.info({ companyId: user.companyId, supplierId: created.id, userId: user.userId }, 'Supplier created');
  return toSupplierDto(created);
}

export async function updateSupplier(
  user: AuthenticatedUser,
  id: string,
  input: UpdateSupplierInput,
): Promise<SupplierDto> {
  const current = await suppliersRepository.findSupplierById(user.companyId, id);
  if (!current) {
    throw AppError.notFound('Supplier not found.');
  }

  const duplicate = await suppliersRepository.findSupplierByName(user.companyId, input.name, id);
  if (duplicate) {
    throw AppError.conflict('SUPPLIER_NAME_TAKEN', `A supplier named "${input.name}" already exists.`);
  }

  const changes = diffFields(current, { ...current, name: input.name }, ['name']);
  if (changes.length === 0) {
    // Nothing actually changed — return the current state without writing a no-op audit row.
    return toSupplierDto(current);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await suppliersRepository.updateSupplier(tx, id, {
      name: input.name,
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

  logger.info({ companyId: user.companyId, supplierId: id, userId: user.userId }, 'Supplier updated');
  return toSupplierDto(updated);
}

export async function deleteSupplier(user: AuthenticatedUser, id: string): Promise<void> {
  const current = await suppliersRepository.findSupplierById(user.companyId, id);
  if (!current) {
    throw AppError.notFound('Supplier not found.');
  }

  await prisma.$transaction(async (tx) => {
    await suppliersRepository.softDeleteSupplier(tx, id, user.userId);
    await writeAuditLog(tx, {
      companyId: user.companyId,
      entityType: ENTITY_TYPE,
      entityId: id,
      action: AUDIT_ACTION.DELETE,
      oldValue: current.name,
      changedBy: user.userId,
    });
  });

  logger.info({ companyId: user.companyId, supplierId: id, userId: user.userId }, 'Supplier deleted');
}
