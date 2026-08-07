import * as makesRepository from '@/modules/masters/makes/makes.repository';
import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { AUDIT_ACTION, diffFields, writeAuditLog } from '@/shared/audit';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { prisma } from '@/shared/prisma';

import * as modelsRepository from './models.repository';
import type { CreateModelInput, ListModelsQuery, UpdateModelInput } from './models.schemas';
import type { ModelDto } from './models.types';

/** Audit entity_type for this master. */
const ENTITY_TYPE = 'product_model';

interface ModelRow {
  id: string;
  name: string;
  makeId: string;
  createdAt: Date;
  updatedAt: Date | null;
  make: { name: string };
}

/** Flattens the nested Prisma `make` relation into `makeName` — never returned nested. */
function toModelDto(row: ModelRow): ModelDto {
  return {
    id: row.id,
    name: row.name,
    makeId: row.makeId,
    makeName: row.make.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface PaginatedModels {
  data: ModelDto[];
  meta: { page: number; limit: number; total: number };
}

export async function listModels(user: AuthenticatedUser, query: ListModelsQuery): Promise<PaginatedModels> {
  const { rows, total } = await modelsRepository.listModels({
    companyId: user.companyId,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    search: query.search,
    sort: query.sort,
    order: query.order,
    makeId: query.makeId,
  });

  return {
    data: rows.map(toModelDto),
    meta: { page: query.page, limit: query.limit, total },
  };
}

export async function getModel(user: AuthenticatedUser, id: string): Promise<ModelDto> {
  const row = await modelsRepository.findModelById(user.companyId, id);
  if (!row) {
    // A row in another tenant is a 404, never a 403 — don't confirm it exists (CLAUDE.md security).
    throw AppError.notFound('Model not found.');
  }
  return toModelDto(row);
}

/**
 * Confirms the make exists, belongs to this tenant, and is not soft-deleted. Reuses the makes
 * repository's finder (not a duplicated query) — without this check a caller could attach a model
 * to any tenant's make by guessing a uuid. Missing/foreign parent -> 404.
 */
async function assertMakeExists(companyId: string, makeId: string): Promise<void> {
  const make = await makesRepository.findMakeById(companyId, makeId);
  if (!make) {
    throw AppError.notFound('Make not found.');
  }
}

/**
 * Create a model. Parent is validated before the duplicate check so a bad makeId fails fast with
 * the more specific error. The duplicate check is scoped by makeId — this is the one place the
 * model module genuinely differs from make/category, per docs/tasks/makes-and-models.md: a model
 * name only has to be unique within its own make, not across the whole tenant. The insert and its
 * audit row share one transaction.
 */
export async function createModel(user: AuthenticatedUser, input: CreateModelInput): Promise<ModelDto> {
  await assertMakeExists(user.companyId, input.makeId);

  const existing = await modelsRepository.findModelByName(user.companyId, input.makeId, input.name);
  if (existing) {
    throw AppError.conflict('MODEL_NAME_TAKEN', `A model named "${input.name}" already exists under this make.`);
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

  logger.info({ companyId: user.companyId, modelId: created.id, userId: user.userId }, 'Model created');
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

  await assertMakeExists(user.companyId, input.makeId);

  // Scoped by the TARGET makeId (input.makeId), not the current one — if this update is also
  // moving the model to a new make, the duplicate check must run against where it's headed.
  const duplicate = await modelsRepository.findModelByName(user.companyId, input.makeId, input.name, id);
  if (duplicate) {
    throw AppError.conflict('MODEL_NAME_TAKEN', `A model named "${input.name}" already exists under this make.`);
  }

  // Diff both name and makeId — moving a model to a different make is a field change too, and the
  // audit log must record the move, not just a rename (docs/tasks/makes-and-models.md).
  const changes = diffFields(current, { ...current, name: input.name, makeId: input.makeId }, [
    'name',
    'makeId',
  ]);
  if (changes.length === 0) {
    // Nothing actually changed — return the current state without writing a no-op audit row.
    return toModelDto(current);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await modelsRepository.updateModel(tx, id, {
      makeId: input.makeId,
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
