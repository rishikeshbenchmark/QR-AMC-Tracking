import { apiClient } from '@/api/client';

import type { CategoryFormValues, CategorySortField } from './customers.schemas';
import type { SortOrder } from '@/components/DataTable';

/** Mirrors the server's CategoryDto. Dates arrive as ISO strings over JSON. */
export interface Category {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface ListCategoriesParams {
  page: number;
  limit: number;
  search?: string;
  sort: CategorySortField;
  order: SortOrder;
}

interface ListEnvelope<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

interface ItemEnvelope<T> {
  data: T;
}

export interface CategoryList {
  categories: Category[];
  meta: { page: number; limit: number; total: number };
}

const BASE_PATH = '/masters/categories';

export async function listCategories(params: ListCategoriesParams): Promise<CategoryList> {
  const res = await apiClient.get<ListEnvelope<Category>>(BASE_PATH, {
    // Drop an empty search so the server sees no param rather than an empty string.
    params: { ...params, search: params.search || undefined },
  });
  return { categories: res.data.data, meta: res.data.meta };
}

export async function createCategory(input: CategoryFormValues): Promise<Category> {
  const res = await apiClient.post<ItemEnvelope<Category>>(BASE_PATH, input);
  return res.data.data;
}

export async function updateCategory(id: string, input: CategoryFormValues): Promise<Category> {
  const res = await apiClient.put<ItemEnvelope<Category>>(`${BASE_PATH}/${id}`, input);
  return res.data.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${id}`);
}
