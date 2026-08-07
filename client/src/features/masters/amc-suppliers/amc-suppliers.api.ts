import { apiClient } from '@/api/client';

import type {
  AmcSupplierFormValues,
  AmcSupplierSortField,
} from './amc-suppliers.schemas';
import type { SortOrder } from '@/components/DataTable';

/** Mirrors the server's AmcSupplierDto. Dates arrive as ISO strings over JSON. */
export interface AmcSupplier {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface ListAmcSuppliersParams {
  page: number;
  limit: number;
  search?: string;
  sort: AmcSupplierSortField;
  order: SortOrder;
}

interface ListEnvelope<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

interface ItemEnvelope<T> {
  data: T;
}

export interface AmcSupplierList {
  amcSuppliers: AmcSupplier[];
  meta: { page: number; limit: number; total: number };
}

const BASE_PATH = '/masters/amc-suppliers';

export async function listAmcSuppliers(
  params: ListAmcSuppliersParams,
): Promise<AmcSupplierList> {
  const res = await apiClient.get<ListEnvelope<AmcSupplier>>(BASE_PATH, {
    params: { ...params, search: params.search || undefined },
  });

  return {
    amcSuppliers: res.data.data,
    meta: res.data.meta,
  };
}

export async function createAmcSupplier(
  input: AmcSupplierFormValues,
): Promise<AmcSupplier> {
  const res = await apiClient.post<ItemEnvelope<AmcSupplier>>(BASE_PATH, input);
  return res.data.data;
}

export async function updateAmcSupplier(
  id: string,
  input: AmcSupplierFormValues,
): Promise<AmcSupplier> {
  const res = await apiClient.put<ItemEnvelope<AmcSupplier>>(
    `${BASE_PATH}/${id}`,
    input,
  );

  return res.data.data;
}

export async function deleteAmcSupplier(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${id}`);
}