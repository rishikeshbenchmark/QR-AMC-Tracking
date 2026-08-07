import { apiClient } from '@/api/client';

import type { MakeFormValues, MakeSortField } from './makes.schemas';
import type { SortOrder } from '@/components/DataTable';

/** Mirrors the server's MakeDto. Dates arrive as ISO strings over JSON. */
export interface Make {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface ListMakesParams {
  page: number;
  limit: number;
  search?: string;
  sort: MakeSortField;
  order: SortOrder;
  /** Optional parent filter — omitted entirely fetches makes across all categories. */
  categoryId?: string;
}

interface ListEnvelope<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

interface ItemEnvelope<T> {
  data: T;
}

export interface MakeList {
  makes: Make[];
  meta: { page: number; limit: number; total: number };
}

const BASE_PATH = '/masters/makes';

export async function listMakes(params: ListMakesParams): Promise<MakeList> {
  const res = await apiClient.get<ListEnvelope<Make>>(BASE_PATH, {
    // Drop empty/undefined optionals so the server sees no param rather than an empty string.
    params: { ...params, search: params.search || undefined, categoryId: params.categoryId || undefined },
  });
  return { makes: res.data.data, meta: res.data.meta };
}

export async function createMake(input: MakeFormValues): Promise<Make> {
  const res = await apiClient.post<ItemEnvelope<Make>>(BASE_PATH, input);
  return res.data.data;
}

export async function updateMake(id: string, input: MakeFormValues): Promise<Make> {
  const res = await apiClient.put<ItemEnvelope<Make>>(`${BASE_PATH}/${id}`, input);
  return res.data.data;
}

export async function deleteMake(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${id}`);
}
