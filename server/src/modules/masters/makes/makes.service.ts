import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { AUDIT_ACTION, diffFields, writeAuditLog } from '@/shared/audit';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { prisma } from '@/shared/prisma';

import * as categoriesRepository from '../categories/categories.repository';

import * as makesRepository from './makes.repository';
import type { MakeRow } from './makes.repository';
import type { CreateMakeInput, ListMakesQuery, UpdateMakeInput } from './makes.schemas';
import type { MakeDto } from './makes.types';

const ENTITY_TYPE = 'product_make';

function toMakeDto(row: MakeRow): MakeDto {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface PaginatedMakes {
  data: MakeDto[];
  meta: { page: number; limit: number; total: number };
}

export async function listMakes(
  user: AuthenticatedUser,
  query: ListMakesQuery,
): Promise<PaginatedMakes> {
  const { rows, total } = await makesRepository.listMakes({
    companyId: user.companyId,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    search: query.search,
    categoryId: query.categoryId,
    sort: query.sort,
    order: query.order,
  });

  return {
    data: rows.map(toMakeDto),
    meta: { page: query.page, limit: query.limit, total },
  };
}

export async function getMake(user: AuthenticatedUser, id: string): Promise<MakeDto> {
  const row = await makesRepository.findMakeById(user.companyId, id);
  if (!row) {
    throw AppError.notFound('Make not found.');
  }
  return toMakeDto(row);
}

/**
 * Create a make (also the on-the-fly create path used by <MasterSelect>). The parent check is not
 * decoration: without it a caller could attach a make to another tenant's category by guessing a
 * uuid, which is why a parent outside this company comes back as a plain 404.
 */
export async function createMake(
  user: AuthenticatedUser,
  input: CreateMakeInput,
): Promise<MakeDto> {
  await assertCategoryExists(user, input.categoryId);

  const existing = await makesRepository.findMakeByName(user.companyId, input.name);
  if (existing) {
    throw AppError.conflict('MAKE_NAME_TAKEN', `A make named "${input.name}" already exists.`);
  }

  const created = await prisma.$transaction(async (tx) => {
    const row = await makesRepository.createMake(tx, {
      companyId: user.companyId,
      categoryId: input.categoryId,
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

  logger.info({ companyId: user.companyId, makeId: created.id, userId: user.userId }, 'Make created');
  return toMakeDto(created);
}

export async function updateMake(
  user: AuthenticatedUser,
  id: string,
  input: UpdateMakeInput,
): Promise<MakeDto> {
  const current = await makesRepository.findMakeById(user.companyId, id);
  if (!current) {
    throw AppError.notFound('Make not found.');
  }

  await assertCategoryExists(user, input.categoryId);

  const duplicate = await makesRepository.findMakeByName(user.companyId, input.name, id);
  if (duplicate) {
    throw AppError.conflict('MAKE_NAME_TAKEN', `A make named "${input.name}" already exists.`);
  }

  // Moving a make between categories is a field change too, so the audit log records the move.
  const changes = diffFields(
    { name: current.name, categoryId: current.categoryId },
    { name: input.name, categoryId: input.categoryId },
    ['name', 'categoryId'],
  );
  if (changes.length === 0) {
    return toMakeDto(current);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await makesRepository.updateMake(tx, id, {
      name: input.name,
      categoryId: input.categoryId,
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

  logger.info({ companyId: user.companyId, makeId: id, userId: user.userId }, 'Make updated');
  return toMakeDto(updated);
}

export async function deleteMake(user: AuthenticatedUser, id: string): Promise<void> {
  const current = await makesRepository.findMakeById(user.companyId, id);
  if (!current) {
    throw AppError.notFound('Make not found.');
  }

  await prisma.$transaction(async (tx) => {
    await makesRepository.softDeleteMake(tx, id, user.userId);
    await writeAuditLog(tx, {
      companyId: user.companyId,
      entityType: ENTITY_TYPE,
      entityId: id,
      action: AUDIT_ACTION.DELETE,
      oldValue: current.name,
      changedBy: user.userId,
    });
  });

  logger.info({ companyId: user.companyId, makeId: id, userId: user.userId }, 'Make deleted');
}

/** Reuses the category repository rather than duplicating the query. */
async function assertCategoryExists(user: AuthenticatedUser, categoryId: string): Promise<void> {
  const category = await categoriesRepository.findCategoryById(user.companyId, categoryId);
  if (!category) {
    throw AppError.notFound('Category not found.');
  }
}
