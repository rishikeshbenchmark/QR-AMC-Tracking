import { randomUUID } from 'node:crypto';

import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { AUDIT_ACTION, writeAuditLog } from '@/shared/audit';
import { AppError } from '@/shared/errors/AppError';
import type { ErrorDetail } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { prisma } from '@/shared/prisma';

import {
  allowedTransitionsFrom,
  ASSET_STATUS,
  canTransition,
  isAssetStatus,
  requiresQcPassedHistory,
} from './assets.lifecycle';
import type { AssetStatus } from './assets.lifecycle';
import * as assetsRepository from './assets.repository';
import type { AssetDetailRow, AssetListRow } from './assets.repository';
import type { ChangeAssetStatusInput, CreateAssetInput, ListAssetsQuery } from './assets.schemas';
import type {
  AssetDetailDto,
  AssetListItemDto,
  AssetPurchaseDto,
  AssetStatusHistoryDto,
} from './assets.types';

/** Audit entity_type values for this module — one per table it writes. */
const ENTITY_TYPE = {
  ASSET: 'asset',
  PURCHASE: 'purchase',
} as const;

/** Field-level rule, enforced here and not in the controller: an unpermitted caller gets no key. */
const COST_PRICE_PERMISSION = 'asset.cost_price.read';

// --- Mappers ---------------------------------------------------------------
// Built up from nothing, field by field. Never derived by deleting keys off a Prisma entity, which
// is how password_hash and cost_price stay out of responses (CLAUDE.md).

function toListItemDto(row: AssetListRow): AssetListItemDto {
  return {
    id: row.id,
    serialNumber: row.serialNumber,
    status: row.status as AssetStatus,
    categoryName: row.category.name,
    makeName: row.make.name,
    modelName: row.model.name,
    supplierName: row.purchase?.supplier.name ?? null,
    createdAt: row.createdAt,
  };
}

function toPurchaseDto(
  purchase: NonNullable<AssetDetailRow['purchase']>,
  canReadCostPrice: boolean,
): AssetPurchaseDto {
  const dto: AssetPurchaseDto = {
    id: purchase.id,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplier.name,
    poNumber: purchase.poNumber,
    supplierInvoiceNo: purchase.supplierInvoiceNo,
    purchaseDate: purchase.purchaseDate,
    supplierWarrantyStart: purchase.supplierWarrantyStart,
    supplierWarrantyEnd: purchase.supplierWarrantyEnd,
    amcSupport: purchase.amcSupport,
    amcSupplierId: purchase.amcSupplierId,
    amcSupplierName: purchase.amcSupplier?.name ?? null,
  };
  if (canReadCostPrice) {
    // Decimal(12,2) is serialised as a string so JSON never rounds money.
    dto.costPrice = purchase.costPrice === null ? null : purchase.costPrice.toString();
  }
  return dto;
}

export interface PaginatedAssets {
  data: AssetListItemDto[];
  meta: { page: number; limit: number; total: number };
}

export async function listAssets(
  user: AuthenticatedUser,
  query: ListAssetsQuery,
): Promise<PaginatedAssets> {
  const { rows, total } = await assetsRepository.listAssets({
    companyId: user.companyId,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    search: query.search,
    status: query.status,
    categoryId: query.categoryId,
    makeId: query.makeId,
    modelId: query.modelId,
    supplierId: query.supplierId,
    sort: query.sort,
    order: query.order,
  });

  return {
    data: rows.map(toListItemDto),
    meta: { page: query.page, limit: query.limit, total },
  };
}

export async function getAsset(user: AuthenticatedUser, id: string): Promise<AssetDetailDto> {
  const row = await assetsRepository.findAssetById(user.companyId, id);
  if (!row) {
    // Another tenant's asset is a 404, never a 403 — don't confirm it exists.
    throw AppError.notFound('Asset not found.');
  }

  const history = await assetsRepository.listStatusHistory(user.companyId, id);
  const changedByIds = [...new Set(history.map((entry) => entry.changedBy).filter((v): v is string => v !== null))];
  const names = await assetsRepository.findUserNames(user.companyId, changedByIds);

  const statusHistory: AssetStatusHistoryDto[] = history.map((entry) => ({
    id: entry.id,
    fromStatus: entry.fromStatus as AssetStatus | null,
    toStatus: entry.toStatus as AssetStatus,
    remarks: entry.remarks,
    changedAt: entry.changedAt,
    changedByName: entry.changedBy === null ? null : names.get(entry.changedBy) ?? null,
  }));

  const status = row.status as AssetStatus;
  return {
    id: row.id,
    serialNumber: row.serialNumber,
    status,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    makeId: row.makeId,
    makeName: row.make.name,
    modelId: row.modelId,
    modelName: row.model.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    purchase:
      row.purchase === null
        ? null
        : toPurchaseDto(row.purchase, user.permissions.includes(COST_PRICE_PERMISSION)),
    statusHistory,
    allowedTransitions: [...allowedTransitionsFrom(status)],
  };
}

/**
 * Purchase Step 1. Validates the master references and the category -> make -> model chain, then
 * writes asset + purchase + the opening status-history row + audit rows in ONE transaction: an asset
 * without its purchase row is not a state this system should ever be able to reach.
 */
export async function createAsset(
  user: AuthenticatedUser,
  input: CreateAssetInput,
): Promise<AssetDetailDto> {
  await assertMasterReferences(user.companyId, input);

  const existing = await assetsRepository.findLiveAssetBySerial(user.companyId, input.serialNumber);
  if (existing) {
    throw AppError.conflict(
      'ASSET_SERIAL_TAKEN',
      `Serial number "${input.serialNumber}" is already registered to a live asset.`,
    );
  }

  // The id is minted here, before the insert, because it is the QR payload and the audit row must
  // be able to reference it (see the schema note on assets.id having no DB default).
  const assetId = randomUUID();

  const created = await prisma.$transaction(async (tx) => {
    const asset = await assetsRepository.createAsset(tx, {
      id: assetId,
      companyId: user.companyId,
      categoryId: input.categoryId,
      makeId: input.makeId,
      modelId: input.modelId,
      serialNumber: input.serialNumber,
      status: ASSET_STATUS.CREATED,
      createdBy: user.userId,
    });

    const purchase = await assetsRepository.createPurchase(tx, {
      companyId: user.companyId,
      assetId,
      supplierId: input.supplierId,
      createdBy: user.userId,
    });

    // fromStatus is NULL on the opening row — there is no previous value to record.
    await assetsRepository.createStatusHistory(tx, {
      companyId: user.companyId,
      assetId,
      fromStatus: null,
      toStatus: ASSET_STATUS.CREATED,
      changedBy: user.userId,
    });

    await writeAuditLog(tx, [
      {
        companyId: user.companyId,
        entityType: ENTITY_TYPE.ASSET,
        entityId: assetId,
        action: AUDIT_ACTION.CREATE,
        newValue: asset.serialNumber,
        changedBy: user.userId,
      },
      {
        companyId: user.companyId,
        entityType: ENTITY_TYPE.PURCHASE,
        entityId: purchase.id,
        action: AUDIT_ACTION.CREATE,
        newValue: assetId,
        changedBy: user.userId,
      },
    ]);

    return asset;
  });

  logger.info(
    { companyId: user.companyId, assetId: created.id, userId: user.userId },
    'Asset registered (purchase step 1)',
  );

  return getAsset(user, created.id);
}

/**
 * The manual status dropdown (ADR-0003). Legality comes from the lifecycle map; the dispatch gate
 * additionally reads history, because one column cannot remember that QC passed. The update and its
 * history row share a transaction — a status change with no audit trail is the bug this prevents.
 */
export async function changeAssetStatus(
  user: AuthenticatedUser,
  id: string,
  input: ChangeAssetStatusInput,
): Promise<{ id: string; serialNumber: string; status: AssetStatus; allowedTransitions: AssetStatus[] }> {
  const asset = await assetsRepository.findAssetStatus(user.companyId, id);
  if (!asset) {
    throw AppError.notFound('Asset not found.');
  }

  if (!isAssetStatus(asset.status)) {
    // Only reachable if a row bypassed ck_assets_status — a data bug, not a client error.
    logger.error({ assetId: id, status: asset.status }, 'Asset holds a status outside the vocabulary');
    throw AppError.unprocessable('ASSET_STATUS_UNKNOWN', 'This asset holds an unrecognised status.');
  }

  const from = asset.status;
  const to = input.status as AssetStatus;

  if (from === to) {
    throw AppError.conflict('ASSET_STATUS_UNCHANGED', `This asset is already ${to}.`);
  }

  if (!canTransition(from, to)) {
    throw AppError.conflict(
      'ILLEGAL_STATUS_TRANSITION',
      `An asset cannot move from ${from} to ${to}.`,
    );
  }

  if (requiresQcPassedHistory(to)) {
    const qcPassed = await assetsRepository.hasStatusInHistory(
      user.companyId,
      id,
      ASSET_STATUS.QC_PASSED,
    );
    if (!qcPassed) {
      throw AppError.unprocessable(
        'QC_NOT_PASSED',
        'This asset cannot be dispatched until it has passed QC.',
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await assetsRepository.updateAssetStatus(tx, id, {
      status: to,
      updatedBy: user.userId,
    });
    await assetsRepository.createStatusHistory(tx, {
      companyId: user.companyId,
      assetId: id,
      fromStatus: from,
      toStatus: to,
      remarks: input.remarks,
      changedBy: user.userId,
    });
    await writeAuditLog(tx, {
      companyId: user.companyId,
      entityType: ENTITY_TYPE.ASSET,
      entityId: id,
      action: AUDIT_ACTION.STATUS_CHANGE,
      fieldName: 'status',
      oldValue: from,
      newValue: to,
      changedBy: user.userId,
    });
    return row;
  });

  logger.info(
    { companyId: user.companyId, assetId: id, from, to, userId: user.userId },
    'Asset status changed',
  );

  return {
    id: updated.id,
    serialNumber: updated.serialNumber,
    status: to,
    allowedTransitions: [...allowedTransitionsFrom(to)],
  };
}

/**
 * Proves every master id exists, is live, and belongs to this tenant — and that the chain is
 * consistent (the make belongs to the category, the model to the make). Collects all problems into
 * one 400 rather than failing on the first, so the form can highlight every bad field at once.
 */
async function assertMasterReferences(companyId: string, input: CreateAssetInput): Promise<void> {
  const [category, make, model, supplier] = await Promise.all([
    assetsRepository.findLiveCategory(companyId, input.categoryId),
    assetsRepository.findLiveMake(companyId, input.makeId),
    assetsRepository.findLiveModel(companyId, input.modelId),
    assetsRepository.findLiveSupplier(companyId, input.supplierId),
  ]);

  const details: ErrorDetail[] = [];
  if (!category) details.push({ field: 'categoryId', issue: 'No such category.' });
  if (!make) details.push({ field: 'makeId', issue: 'No such make.' });
  if (!model) details.push({ field: 'modelId', issue: 'No such model.' });
  if (!supplier) details.push({ field: 'supplierId', issue: 'No such supplier.' });

  if (make && category && make.categoryId !== category.id) {
    details.push({ field: 'makeId', issue: 'This make does not belong to the selected category.' });
  }
  if (model && make && model.makeId !== make.id) {
    details.push({ field: 'modelId', issue: 'This model does not belong to the selected make.' });
  }

  if (details.length > 0) {
    throw AppError.badRequest(
      'INVALID_MASTER_REFERENCE',
      'One or more selected master records are invalid.',
      details,
    );
  }
}
