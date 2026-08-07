import { apiClient } from '@/api/client';

import type { ModelFormValues, ModelSortField } from './models.schemas';
import type { SortOrder } from '@/components/DataTable';

/** Mirrors the server's ModelDto. Dates arrive as ISO strings over JSON. */
export interface Model {
  id: string;
  name: string;
  makeId: string;
  makeName: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface ListModelsParams {
  page: number;
  limit: number;
  search?: string;
  sort: ModelSortField;
  order: SortOrder;
  /** Optional parent filter — the Models page's "filter by make" control lives here. */
  makeId?: string;
}

interface ListEnvelope<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

interface ItemEnvelope<T> {
  data: T;
}

export interface ModelList {
  models: Model[];
  meta: { page: number; limit: number; total: number };
}

const BASE_PATH = '/masters/models';

export async function listModels(params: ListModelsParams): Promise<ModelList> {
  const res = await apiClient.get<ListEnvelope<Model>>(BASE_PATH, {
    // Drop empty/undefined optionals so the server sees no param rather than an empty string.
    params: { ...params, search: params.search || undefined, makeId: params.makeId || undefined },
  });
  return { models: res.data.data, meta: res.data.meta };
}

export async function createModel(input: ModelFormValues): Promise<Model> {
  const res = await apiClient.post<ItemEnvelope<Model>>(BASE_PATH, input);
  return res.data.data;
}

export async function updateModel(id: string, input: ModelFormValues): Promise<Model> {
  const res = await apiClient.put<ItemEnvelope<Model>>(`${BASE_PATH}/${id}`, input);
  return res.data.data;
}

export async function deleteModel(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${id}`);
}
