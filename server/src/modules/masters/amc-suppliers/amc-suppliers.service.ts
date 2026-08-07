import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { AUDIT_ACTION, diffFields, writeAuditLog } from '@/shared/audit';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { prisma } from '@/shared/prisma';

import * as amcSuppliersRepository from './amc-suppliers.repository';
import type {
  CreateAmcSupplierInput,
  ListAmcSuppliersQuery,
  UpdateAmcSupplierInput,
} from './amc-suppliers.schemas';
import type { AmcSupplierDto } from './amc-suppliers.types';

/** Audit entity_type for this master. */
const ENTITY_TYPE = 'amc_supplier';

interface AmcSupplierRow {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date | null;
}

function toAmcSupplierDto(row: AmcSupplierRow): AmcSupplierDto {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface PaginatedAmcSuppliers {
  data: AmcSupplierDto[];
  meta: { page: number; limit: number; total: number };
}

export async function listAmcSuppliers(
  user: AuthenticatedUser,
  query: ListAmcSuppliersQuery,
): Promise<PaginatedAmcSuppliers> {
  const { rows, total } = await amcSuppliersRepository.listAmcSuppliers({
    companyId: user.companyId,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    search: query.search,
    sort: query.sort,
    order: query.order,
  });

  return {
    data: rows.map(toAmcSupplierDto),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
    },
  };
}

export async function getAmcSupplier(
  user: AuthenticatedUser,
  id: string,
): Promise<AmcSupplierDto> {
  const row = await amcSuppliersRepository.findAmcSupplierById(user.companyId, id);

  if (!row) {
    throw AppError.notFound('AMC Supplier not found.');
  }

  return toAmcSupplierDto(row);
}

export async function createAmcSupplier(
  user: AuthenticatedUser,
  input: CreateAmcSupplierInput,
): Promise<AmcSupplierDto> {
  const existing = await amcSuppliersRepository.findAmcSupplierByName(
    user.companyId,
    input.name,
  );

  if (existing) {
    throw AppError.conflict(
      'AMC_SUPPLIER_NAME_TAKEN',
      `An AMC supplier named "${input.name}" already exists.`,
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const row = await amcSuppliersRepository.createAmcSupplier(tx, {
      companyId: user.companyId,
      name: input.name,
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

  logger.info(
    {
      companyId: user.companyId,
      amcSupplierId: created.id,
      userId: user.userId,
    },
    'AMC Supplier created',
  );

  return toAmcSupplierDto(created);
}

export async function updateAmcSupplier(
  user: AuthenticatedUser,
  id: string,
  input: UpdateAmcSupplierInput,
): Promise<AmcSupplierDto> {
  const current = await amcSuppliersRepository.findAmcSupplierById(
    user.companyId,
    id,
  );

  if (!current) {
    throw AppError.notFound('AMC Supplier not found.');
  }

  const duplicate = await amcSuppliersRepository.findAmcSupplierByName(
    user.companyId,
    input.name,
    id,
  );

  if (duplicate) {
    throw AppError.conflict(
      'AMC_SUPPLIER_NAME_TAKEN',
      `An AMC supplier named "${input.name}" already exists.`,
    );
  }

  const changes = diffFields(current, { ...current, name: input.name }, ['name']);

  if (changes.length === 0) {
    return toAmcSupplierDto(current);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await amcSuppliersRepository.updateAmcSupplier(tx, id, {
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

  logger.info(
    {
      companyId: user.companyId,
      amcSupplierId: id,
      userId: user.userId,
    },
    'AMC Supplier updated',
  );

  return toAmcSupplierDto(updated);
}

export async function deleteAmcSupplier(
  user: AuthenticatedUser,
  id: string,
): Promise<void> {
  const current = await amcSuppliersRepository.findAmcSupplierById(
    user.companyId,
    id,
  );

  if (!current) {
    throw AppError.notFound('AMC Supplier not found.');
  }

  await prisma.$transaction(async (tx) => {
    await amcSuppliersRepository.softDeleteAmcSupplier(tx, id, user.userId);

    await writeAuditLog(tx, {
      companyId: user.companyId,
      entityType: ENTITY_TYPE,
      entityId: id,
      action: AUDIT_ACTION.DELETE,
      oldValue: current.name,
      changedBy: user.userId,
    });
  });

  logger.info(
    {
      companyId: user.companyId,
      amcSupplierId: id,
      userId: user.userId,
    },
    'AMC Supplier deleted',
  );
}