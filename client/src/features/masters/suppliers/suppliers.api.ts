import { apiClient } from '@/api/client';

import type { SupplierFormValues, SupplierSortField } from './suppliers.schemas';
import type { SortOrder } from '@/components/DataTable';

/** Mirrors the server's SupplierDto. Dates arrive as ISO strings over JSON. */
export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ListSuppliersParams {
  page: number;
  limit: number;
  search?: string;
  sort: SupplierSortField;
  order: SortOrder;
}

interface ListEnvelope<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

interface ItemEnvelope<T> {
  data: T;
}

export interface SupplierList {
  suppliers: Supplier[];
  meta: { page: number; limit: number; total: number };
}
const BASE_PATH = '/masters/suppliers';
export async function listSuppliers(params: ListSuppliersParams): Promise<SupplierList> {
  const res = await apiClient.get<ListEnvelope<Supplier>>(BASE_PATH, {
    // Drop an empty search so the server sees no param rather than an empty string.
    params: { ...params, search: params.search || undefined },
  });
  return { suppliers: res.data.data, meta: res.data.meta };
}

export async function createSupplier(input: SupplierFormValues): Promise<Supplier> {
  const res = await apiClient.post<ItemEnvelope<Supplier>>(BASE_PATH, input);
  return res.data.data;
}

export async function updateSupplier(id: string, input: SupplierFormValues): Promise<Supplier> {
  const res = await apiClient.put<ItemEnvelope<Supplier>>(`${BASE_PATH}/${id}`, input);
  return res.data.data;
}

export async function deleteSupplier(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${id}`);
}
