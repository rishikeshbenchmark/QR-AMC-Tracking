import { apiClient } from '@/api/client';
import type { SortOrder } from '@/components/DataTable';

import type { AssetSortField, ChangeStatusFormValues, RegisterAssetFormValues } from './assets.schemas';
import type { AssetStatus } from './assets.status';

/** Mirrors the server's AssetListItemDto. Dates arrive as ISO strings over JSON. */
export interface AssetListItem {
  id: string;
  serialNumber: string;
  status: AssetStatus;
  categoryName: string;
  makeName: string;
  modelName: string;
  supplierName: string | null;
  createdAt: string;
}

/**
 * Mirrors AssetPurchaseDto. `costPrice` is OPTIONAL, not nullable: the server omits the key entirely
 * for a user without `asset.cost_price.read`, so `'costPrice' in purchase` is the masking check —
 * `costPrice === null` means "permitted, but not filled in yet".
 */
export interface AssetPurchase {
  id: string;
  supplierId: string;
  supplierName: string;
  poNumber: string | null;
  supplierInvoiceNo: string | null;
  purchaseDate: string | null;
  supplierWarrantyStart: string | null;
  supplierWarrantyEnd: string | null;
  amcSupport: string | null;
  amcSupplierId: string | null;
  amcSupplierName: string | null;
  costPrice?: string | null;
}

export interface AssetStatusHistoryEntry {
  id: string;
  fromStatus: AssetStatus | null;
  toStatus: AssetStatus;
  remarks: string | null;
  changedAt: string;
  changedByName: string | null;
}

export interface AssetDetail {
  id: string;
  serialNumber: string;
  status: AssetStatus;
  categoryId: string;
  categoryName: string;
  makeId: string;
  makeName: string;
  modelId: string;
  modelName: string;
  createdAt: string;
  updatedAt: string | null;
  purchase: AssetPurchase | null;
  statusHistory: AssetStatusHistoryEntry[];
  /** Legal next values, decided by the server's lifecycle map — the dropdown renders exactly these. */
  allowedTransitions: AssetStatus[];
}

export interface ListAssetsParams {
  page: number;
  limit: number;
  search?: string;
  status?: AssetStatus;
  categoryId?: string;
  makeId?: string;
  modelId?: string;
  supplierId?: string;
  sort: AssetSortField;
  order: SortOrder;
}

interface ListEnvelope<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

interface ItemEnvelope<T> {
  data: T;
}

export interface AssetList {
  assets: AssetListItem[];
  meta: { page: number; limit: number; total: number };
}

export interface StatusChangeResult {
  id: string;
  serialNumber: string;
  status: AssetStatus;
  allowedTransitions: AssetStatus[];
}

const BASE_PATH = '/assets';

export async function listAssets(params: ListAssetsParams): Promise<AssetList> {
  const res = await apiClient.get<ListEnvelope<AssetListItem>>(BASE_PATH, {
    // Drop empty filters so the server sees no param rather than an empty string.
    params: {
      ...params,
      search: params.search || undefined,
      status: params.status || undefined,
      categoryId: params.categoryId || undefined,
      makeId: params.makeId || undefined,
      modelId: params.modelId || undefined,
      supplierId: params.supplierId || undefined,
    },
  });
  return { assets: res.data.data, meta: res.data.meta };
}

export async function getAsset(id: string): Promise<AssetDetail> {
  const res = await apiClient.get<ItemEnvelope<AssetDetail>>(`${BASE_PATH}/${id}`);
  return res.data.data;
}

/** Purchase Step 1 — the server creates the asset and its purchase row in one transaction. */
export async function registerAsset(input: RegisterAssetFormValues): Promise<AssetDetail> {
  const res = await apiClient.post<ItemEnvelope<AssetDetail>>(BASE_PATH, input);
  return res.data.data;
}

export async function changeAssetStatus(
  id: string,
  input: ChangeStatusFormValues,
): Promise<StatusChangeResult> {
  const res = await apiClient.patch<ItemEnvelope<StatusChangeResult>>(
    `${BASE_PATH}/${id}/status`,
    input,
  );
  return res.data.data;
}
