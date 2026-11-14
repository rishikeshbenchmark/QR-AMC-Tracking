import type { Prisma } from '@prisma/client';

import { prisma } from '@/shared/prisma';

import { ASSET_STATUS } from './assets.lifecycle';

/**
 * The one place the assets / purchases / asset_status_history tables are queried. Every read filters
 * `company_id` AND `is_deleted = false`; writes take a transaction client so a mutation, its history
 * row and its audit rows commit or roll back together.
 */

export type AssetListSort = 'serialNumber' | 'status' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface ListParams {
  companyId: string;
  skip: number;
  take: number;
  search?: string;
  status?: string;
  categoryId?: string;
  makeId?: string;
  modelId?: string;
  supplierId?: string;
  sort: AssetListSort;
  order: SortOrder;
}

/** Master names come along so the list table needs no per-row follow-up query (no N+1). */
const assetListSelect = {
  id: true,
  serialNumber: true,
  status: true,
  createdAt: true,
  category: { select: { name: true } },
  make: { select: { name: true } },
  model: { select: { name: true } },
  purchase: { select: { supplier: { select: { name: true } } } },
} satisfies Prisma.AssetSelect;

const assetDetailSelect = {
  id: true,
  serialNumber: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  categoryId: true,
  makeId: true,
  modelId: true,
  category: { select: { name: true } },
  make: { select: { name: true } },
  model: { select: { name: true } },
  purchase: {
    select: {
      id: true,
      supplierId: true,
      poNumber: true,
      supplierInvoiceNo: true,
      purchaseDate: true,
      supplierWarrantyStart: true,
      supplierWarrantyEnd: true,
      costPrice: true,
      amcSupport: true,
      amcSupplierId: true,
      supplier: { select: { name: true } },
      amcSupplier: { select: { name: true } },
    },
  },
} satisfies Prisma.AssetSelect;

export type AssetListRow = Prisma.AssetGetPayload<{ select: typeof assetListSelect }>;
export type AssetDetailRow = Prisma.AssetGetPayload<{ select: typeof assetDetailSelect }>;

function baseWhere(params: ListParams): Prisma.AssetWhereInput {
  return {
    companyId: params.companyId,
    isDeleted: false,
    ...(params.search ? { serialNumber: { contains: params.search } } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    ...(params.makeId ? { makeId: params.makeId } : {}),
    ...(params.modelId ? { modelId: params.modelId } : {}),
    ...(params.supplierId ? { purchase: { supplierId: params.supplierId, isDeleted: false } } : {}),
  };
}

export async function listAssets(params: ListParams) {
  const where = baseWhere(params);
  const [rows, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      select: assetListSelect,
      orderBy: { [params.sort]: params.order },
      skip: params.skip,
      take: params.take,
    }),
    prisma.asset.count({ where }),
  ]);
  return { rows, total };
}

export function findAssetById(companyId: string, id: string) {
  return prisma.asset.findFirst({
    where: { id, companyId, isDeleted: false },
    select: assetDetailSelect,
  });
}

/** Minimal read for the status endpoint — no joins needed to decide a transition. */
export function findAssetStatus(companyId: string, id: string) {
  return prisma.asset.findFirst({
    where: { id, companyId, isDeleted: false },
    select: { id: true, serialNumber: true, status: true },
  });
}

/**
 * A live asset already carrying this serial. Mirrors ux_assets_company_serial, which is filtered
 * `is_deleted = 0 AND status <> 'DISCARDED'` — so a discarded asset's serial is free to re-register
 * under a new asset on resale.
 */
export function findLiveAssetBySerial(companyId: string, serialNumber: string) {
  return prisma.asset.findFirst({
    where: {
      companyId,
      isDeleted: false,
      serialNumber,
      status: { not: ASSET_STATUS.DISCARDED },
    },
    select: { id: true, status: true },
  });
}

/** Does this asset have a QC_PASSED row in its history? The dispatch gate (ADR-0003). */
export async function hasStatusInHistory(
  companyId: string,
  assetId: string,
  status: string,
): Promise<boolean> {
  const row = await prisma.assetStatusHistory.findFirst({
    where: { companyId, assetId, toStatus: status },
    select: { id: true },
  });
  return row !== null;
}

export function listStatusHistory(companyId: string, assetId: string) {
  return prisma.assetStatusHistory.findMany({
    where: { companyId, assetId },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      remarks: true,
      changedAt: true,
      changedBy: true,
    },
    orderBy: { changedAt: 'asc' },
  });
}

/** Resolves the "changed by" names for a history list in one query — never one per row. */
export async function findUserNames(
  companyId: string,
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const rows = await prisma.user.findMany({
    where: { companyId, id: { in: userIds } },
    select: { id: true, name: true },
  });
  return new Map(rows.map((row) => [row.id, row.name]));
}

// --- Master existence checks ------------------------------------------------
// The asset module reads the master tables directly rather than calling the masters services:
// these are tenant-scoped existence checks, not master CRUD, and they must also prove the
// category -> make -> model chain is consistent, which no single master owns.

export function findLiveCategory(companyId: string, id: string) {
  return prisma.productCategory.findFirst({
    where: { id, companyId, isDeleted: false },
    select: { id: true },
  });
}

export function findLiveMake(companyId: string, id: string) {
  return prisma.productMake.findFirst({
    where: { id, companyId, isDeleted: false },
    select: { id: true, categoryId: true },
  });
}

export function findLiveModel(companyId: string, id: string) {
  return prisma.productModel.findFirst({
    where: { id, companyId, isDeleted: false },
    select: { id: true, makeId: true },
  });
}

export function findLiveSupplier(companyId: string, id: string) {
  return prisma.supplier.findFirst({
    where: { id, companyId, isDeleted: false },
    select: { id: true },
  });
}

// --- Writes ----------------------------------------------------------------

interface CreateAssetData {
  id: string;
  companyId: string;
  categoryId: string;
  makeId: string;
  modelId: string;
  serialNumber: string;
  status: string;
  createdBy: string;
}

/** `id` is supplied by the service (UUID v4) — assets.id has no DB default, it is the QR payload. */
export function createAsset(tx: Prisma.TransactionClient, data: CreateAssetData) {
  return tx.asset.create({
    data,
    select: { id: true, serialNumber: true, status: true, createdAt: true },
  });
}

export function createPurchase(
  tx: Prisma.TransactionClient,
  data: { companyId: string; assetId: string; supplierId: string; createdBy: string },
) {
  return tx.purchase.create({
    data,
    select: { id: true },
  });
}

export function createStatusHistory(
  tx: Prisma.TransactionClient,
  data: {
    companyId: string;
    assetId: string;
    fromStatus: string | null;
    toStatus: string;
    remarks?: string | null;
    changedBy: string;
  },
) {
  return tx.assetStatusHistory.create({
    data: {
      companyId: data.companyId,
      assetId: data.assetId,
      fromStatus: data.fromStatus,
      toStatus: data.toStatus,
      remarks: data.remarks ?? null,
      changedBy: data.changedBy,
    },
    select: { id: true },
  });
}

export function updateAssetStatus(
  tx: Prisma.TransactionClient,
  id: string,
  data: { status: string; updatedBy: string },
) {
  return tx.asset.update({
    where: { id },
    data: {
      status: data.status,
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    },
    select: { id: true, serialNumber: true, status: true },
  });
}
