import * as categoriesRepository from '@/modules/masters/categories/categories.repository';
import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { AUDIT_ACTION, diffFields, writeAuditLog } from '@/shared/audit';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { prisma } from '@/shared/prisma';

import * as makesRepository from './makes.repository';
import type { CreateMakeInput, ListMakesQuery, UpdateMakeInput } from './makes.schemas';
import type { MakeDto } from './makes.types';

/** Audit entity_type for this master. */
const ENTITY_TYPE = 'product_make';

interface MakeRow {
  id: string;
  name: string;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date | null;
  category: { name: string };
}

/** Flattens the nested Prisma `category` relation into `categoryName` — never returned nested. */
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

export async function listMakes(user: AuthenticatedUser, query: ListMakesQuery): Promise<PaginatedMakes> {
  const { rows, total } = await makesRepository.listMakes({
    companyId: user.companyId,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    search: query.search,
    sort: query.sort,
    order: query.order,
    categoryId: query.categoryId,
  });

  return {
    data: rows.map(toMakeDto),
    meta: { page: query.page, limit: query.limit, total },
  };
}

export async function getMake(user: AuthenticatedUser, id: string): Promise<MakeDto> {
  const row = await makesRepository.findMakeById(user.companyId, id);
  if (!row) {
    // A row in another tenant is a 404, never a 403 — don't confirm it exists (CLAUDE.md security).
    throw AppError.notFound('Make not found.');
  }
  return toMakeDto(row);
}

/**
 * Confirms the category exists, belongs to this tenant, and is not soft-deleted. Reuses the
 * categories repository's finder (not a duplicated query) — without this check a caller could
 * attach a make to any tenant's category by guessing a uuid. Missing/foreign parent -> 404.
 */
async function assertCategoryExists(companyId: string, categoryId: string): Promise<void> {
  const category = await categoriesRepository.findCategoryById(companyId, categoryId);
  if (!category) {
    throw AppError.notFound('Category not found.');
  }
}

/**
 * Create a make (also the on-the-fly create path used by <MasterSelect> when building a model).
 * Parent is validated before the duplicate check so a bad categoryId fails fast with the more
 * specific error. The insert and its audit row share one transaction.
 */
export async function createMake(user: AuthenticatedUser, input: CreateMakeInput): Promise<MakeDto> {
  await assertCategoryExists(user.companyId, input.categoryId);

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

  await assertCategoryExists(user.companyId, input.categoryId);

  const duplicate = await makesRepository.findMakeByName(user.companyId, input.name, id);
  if (duplicate) {
    throw AppError.conflict('MAKE_NAME_TAKEN', `A make named "${input.name}" already exists.`);
  }

  // Diff both name and categoryId — moving a make to a different category is a field change too,
  // and the audit log must record the move, not just a rename (docs/tasks/makes-and-models.md).
  const changes = diffFields(current, { ...current, name: input.name, categoryId: input.categoryId }, [
    'name',
    'categoryId',
  ]);
  if (changes.length === 0) {
    // Nothing actually changed — return the current state without writing a no-op audit row.
    return toMakeDto(current);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await makesRepository.updateMake(tx, id, {
      categoryId: input.categoryId,
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
