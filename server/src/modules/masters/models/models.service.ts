import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { AUDIT_ACTION, diffFields, writeAuditLog } from '@/shared/audit';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { prisma } from '@/shared/prisma';

import * as makesRepository from '../makes/makes.repository';

import * as modelsRepository from './models.repository';
import type { ModelRow } from './models.repository';
import type { CreateModelInput, ListModelsQuery, UpdateModelInput } from './models.schemas';
import type { ModelDto } from './models.types';

const ENTITY_TYPE = 'product_model';

function toModelDto(row: ModelRow): ModelDto {
  return {
    id: row.id,
    name: row.name,
    makeId: row.makeId,
    makeName: row.make.name,
    categoryId: row.make.categoryId,
    categoryName: row.make.category.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface PaginatedModels {
  data: ModelDto[];
  meta: { page: number; limit: number; total: number };
}

export async function listModels(
  user: AuthenticatedUser,
  query: ListModelsQuery,
): Promise<PaginatedModels> {
  const { rows, total } = await modelsRepository.listModels({
    companyId: user.companyId,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    search: query.search,
    makeId: query.makeId,
    categoryId: query.categoryId,
    sort: query.sort,
    order: query.order,
  });

  return {
    data: rows.map(toModelDto),
    meta: { page: query.page, limit: query.limit, total },
  };
}

export async function getModel(user: AuthenticatedUser, id: string): Promise<ModelDto> {
  const row = await modelsRepository.findModelById(user.companyId, id);
  if (!row) {
    throw AppError.notFound('Model not found.');
  }
  return toModelDto(row);
}

/**
 * Create a model (also the on-the-fly create path used by <MasterSelect>). Note the duplicate check
 * is scoped to the make: uniqueness here is (company, make, name), so "ThinkPad T14" under Lenovo
 * does not block the same name under another make.
 */
export async function createModel(
  user: AuthenticatedUser,
  input: CreateModelInput,
): Promise<ModelDto> {
  await assertMakeExists(user, input.makeId);

  const existing = await modelsRepository.findModelByName(user.companyId, input.makeId, input.name);
  if (existing) {
    throw AppError.conflict(
      'MODEL_NAME_TAKEN',
      `A model named "${input.name}" already exists under this make.`,
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const row = await modelsRepository.createModel(tx, {
      companyId: user.companyId,
      makeId: input.makeId,
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
    { companyId: user.companyId, modelId: created.id, userId: user.userId },
    'Model created',
  );
  return toModelDto(created);
}

export async function updateModel(
  user: AuthenticatedUser,
  id: string,
  input: UpdateModelInput,
): Promise<ModelDto> {
  const current = await modelsRepository.findModelById(user.companyId, id);
  if (!current) {
    throw AppError.notFound('Model not found.');
  }

  await assertMakeExists(user, input.makeId);

  // Checked against the TARGET make, which is what the unique index will see after the move.
  const duplicate = await modelsRepository.findModelByName(
    user.companyId,
    input.makeId,
    input.name,
    id,
  );
  if (duplicate) {
    throw AppError.conflict(
      'MODEL_NAME_TAKEN',
      `A model named "${input.name}" already exists under this make.`,
    );
  }

  const changes = diffFields(
    { name: current.name, makeId: current.makeId },
    { name: input.name, makeId: input.makeId },
    ['name', 'makeId'],
  );
  if (changes.length === 0) {
    return toModelDto(current);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await modelsRepository.updateModel(tx, id, {
      name: input.name,
      makeId: input.makeId,
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

  logger.info({ companyId: user.companyId, modelId: id, userId: user.userId }, 'Model updated');
  return toModelDto(updated);
}

export async function deleteModel(user: AuthenticatedUser, id: string): Promise<void> {
  const current = await modelsRepository.findModelById(user.companyId, id);
  if (!current) {
    throw AppError.notFound('Model not found.');
  }

  await prisma.$transaction(async (tx) => {
    await modelsRepository.softDeleteModel(tx, id, user.userId);
    await writeAuditLog(tx, {
      companyId: user.companyId,
      entityType: ENTITY_TYPE,
      entityId: id,
      action: AUDIT_ACTION.DELETE,
      oldValue: current.name,
      changedBy: user.userId,
    });
  });

  logger.info({ companyId: user.companyId, modelId: id, userId: user.userId }, 'Model deleted');
}

/** Reuses the make repository rather than duplicating the query. */
async function assertMakeExists(user: AuthenticatedUser, makeId: string): Promise<void> {
  const make = await makesRepository.findMakeById(user.companyId, makeId);
  if (!make) {
    throw AppError.notFound('Make not found.');
  }
}
