import type { AssetStatus } from './assets.lifecycle';

/**
 * Asset response shapes, built explicitly by mappers in the service — never a raw Prisma entity
 * (CLAUDE.md). `costPrice` is deliberately optional rather than nullable: a user without
 * `asset.cost_price.read` gets a DTO with the key ABSENT, not set to null.
 */

/** One row of the asset list. Master names are resolved so the table needs no follow-up requests. */
export interface AssetListItemDto {
  id: string;
  serialNumber: string;
  status: AssetStatus;
  categoryName: string;
  makeName: string;
  modelName: string;
  supplierName: string | null;
  createdAt: Date;
}

/** The Step-1 purchase surface. Step-2 fields land on Day 5 and are null until then. */
export interface AssetPurchaseDto {
  id: string;
  supplierId: string;
  supplierName: string;
  poNumber: string | null;
  supplierInvoiceNo: string | null;
  purchaseDate: Date | null;
  supplierWarrantyStart: Date | null;
  supplierWarrantyEnd: Date | null;
  amcSupport: string | null;
  amcSupplierId: string | null;
  amcSupplierName: string | null;
  /** Present only when the caller holds `asset.cost_price.read`. */
  costPrice?: string | null;
}

export interface AssetStatusHistoryDto {
  id: string;
  fromStatus: AssetStatus | null;
  toStatus: AssetStatus;
  remarks: string | null;
  changedAt: Date;
  changedByName: string | null;
}

export interface AssetDetailDto {
  id: string;
  serialNumber: string;
  status: AssetStatus;
  categoryId: string;
  categoryName: string;
  makeId: string;
  makeName: string;
  modelId: string;
  modelName: string;
  createdAt: Date;
  updatedAt: Date | null;
  purchase: AssetPurchaseDto | null;
  statusHistory: AssetStatusHistoryDto[];
  /** Legal next values for the manual dropdown, from the lifecycle map. */
  allowedTransitions: AssetStatus[];
}
