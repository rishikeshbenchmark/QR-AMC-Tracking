import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { AUDIT_ACTION, diffFields, writeAuditLog } from '@/shared/audit';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { prisma } from '@/shared/prisma';

import * as categoriesRepository from './categories.repository';
import type { CreateCategoryInput, ListCategoriesQuery, UpdateCategoryInput } from './categories.schemas';
import type { CategoryDto } from './categories.types';

/** Audit entity_type for this master. Interns cloning this file change this one string. */
const ENTITY_TYPE = 'product_category';

interface CategoryRow {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date | null;
}

function toCategoryDto(row: CategoryRow): CategoryDto {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface PaginatedCategories {
  data: CategoryDto[];
  meta: { page: number; limit: number; total: number };
}

export async function listCategories(
  user: AuthenticatedUser,
  query: ListCategoriesQuery,
): Promise<PaginatedCategories> {
  const { rows, total } = await categoriesRepository.listCategories({
    companyId: user.companyId,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    search: query.search,
    sort: query.sort,
    order: query.order,
  });

  return {
    data: rows.map(toCategoryDto),
    meta: { page: query.page, limit: query.limit, total },
  };
}

export async function getCategory(user: AuthenticatedUser, id: string): Promise<CategoryDto> {
  const row = await categoriesRepository.findCategoryById(user.companyId, id);
  if (!row) {
    // A row in another tenant is a 404, never a 403 — don't confirm it exists (CLAUDE.md security).
    throw AppError.notFound('Category not found.');
  }
  return toCategoryDto(row);
}

/**
 * Create a category (also the on-the-fly create path used by <MasterSelect>). The duplicate check
 * returns 409 before hitting the DB; the filtered unique index is the backstop if two requests race.
 * The insert and its audit row share one transaction.
 */
export async function createCategory(
  user: AuthenticatedUser,
  input: CreateCategoryInput,
): Promise<CategoryDto> {
  const existing = await categoriesRepository.findCategoryByName(user.companyId, input.name);
  if (existing) {
    throw AppError.conflict('CATEGORY_NAME_TAKEN', `A category named "${input.name}" already exists.`);
  }

  const created = await prisma.$transaction(async (tx) => {
    const row = await categoriesRepository.createCategory(tx, {
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

  logger.info({ companyId: user.companyId, categoryId: created.id, userId: user.userId }, 'Category created');
  return toCategoryDto(created);
}

export async function updateCategory(
  user: AuthenticatedUser,
  id: string,
  input: UpdateCategoryInput,
): Promise<CategoryDto> {
  const current = await categoriesRepository.findCategoryById(user.companyId, id);
  if (!current) {
    throw AppError.notFound('Category not found.');
  }

  const duplicate = await categoriesRepository.findCategoryByName(user.companyId, input.name, id);
  if (duplicate) {
    throw AppError.conflict('CATEGORY_NAME_TAKEN', `A category named "${input.name}" already exists.`);
  }

  const changes = diffFields(current, { ...current, name: input.name }, ['name']);
  if (changes.length === 0) {
    // Nothing actually changed — return the current state without writing a no-op audit row.
    return toCategoryDto(current);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await categoriesRepository.updateCategory(tx, id, {
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

  logger.info({ companyId: user.companyId, categoryId: id, userId: user.userId }, 'Category updated');
  return toCategoryDto(updated);
}

export async function deleteCategory(user: AuthenticatedUser, id: string): Promise<void> {
  const current = await categoriesRepository.findCategoryById(user.companyId, id);
  if (!current) {
    throw AppError.notFound('Category not found.');
  }

  await prisma.$transaction(async (tx) => {
    await categoriesRepository.softDeleteCategory(tx, id, user.userId);
    await writeAuditLog(tx, {
      companyId: user.companyId,
      entityType: ENTITY_TYPE,
      entityId: id,
      action: AUDIT_ACTION.DELETE,
      oldValue: current.name,
      changedBy: user.userId,
    });
  });

  logger.info({ companyId: user.companyId, categoryId: id, userId: user.userId }, 'Category deleted');
}
