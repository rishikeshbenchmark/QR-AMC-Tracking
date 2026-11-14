import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/api/client';

/**
 * Read-and-create hooks for the master dropdowns on the asset, purchase and sale forms.
 *
 * This is NOT the masters CRUD layer — each master owns a `<resource>.api.ts` / `.queries.ts` pair
 * for its own management page. What forms need is different and much smaller: the full option list
 * (not a page of 25) and the inline create that <MasterSelect> calls. Keeping it here means the
 * asset form does not import five feature folders, and the per-master CRUD files stay free for the
 * work that owns them.
 */

export interface MasterOptionRow {
  id: string;
  name: string;
}

interface ListEnvelope<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

interface ItemEnvelope<T> {
  data: T;
}

/**
 * The API caps `limit` at 100. Masters are small reference tables, and <MasterSelect> filters the
 * loaded list in the browser — if a tenant ever passes 100 of one master, this is the line that has
 * to become a server-side search.
 */
const LOOKUP_LIMIT = 100;

export const masterLookupKeys = {
  all: ['master-lookups'] as const,
  categories: () => [...masterLookupKeys.all, 'categories'] as const,
  makes: (categoryId: string | null) => [...masterLookupKeys.all, 'makes', categoryId] as const,
  models: (makeId: string | null) => [...masterLookupKeys.all, 'models', makeId] as const,
  suppliers: () => [...masterLookupKeys.all, 'suppliers'] as const,
};

async function fetchOptions(
  path: string,
  params: Record<string, string | number> = {},
): Promise<MasterOptionRow[]> {
  const res = await apiClient.get<ListEnvelope<MasterOptionRow>>(path, {
    params: { limit: LOOKUP_LIMIT, sort: 'name', order: 'asc', ...params },
  });
  return res.data.data.map((row) => ({ id: row.id, name: row.name }));
}

export function useCategoryOptions() {
  return useQuery({
    queryKey: masterLookupKeys.categories(),
    queryFn: () => fetchOptions('/masters/categories'),
  });
}

/** Makes under one category — the second step of the cascade. Idle until a category is picked. */
export function useMakeOptions(categoryId: string | null) {
  return useQuery({
    queryKey: masterLookupKeys.makes(categoryId),
    queryFn: () => fetchOptions('/masters/makes', { categoryId: categoryId as string }),
    enabled: categoryId !== null,
  });
}

/** Models under one make — the third step. Idle until a make is picked. */
export function useModelOptions(makeId: string | null) {
  return useQuery({
    queryKey: masterLookupKeys.models(makeId),
    queryFn: () => fetchOptions('/masters/models', { makeId: makeId as string }),
    enabled: makeId !== null,
  });
}

export function useSupplierOptions() {
  return useQuery({
    queryKey: masterLookupKeys.suppliers(),
    queryFn: () => fetchOptions('/masters/suppliers'),
  });
}

async function createOption(
  path: string,
  body: Record<string, string>,
): Promise<MasterOptionRow> {
  const res = await apiClient.post<ItemEnvelope<MasterOptionRow>>(path, body);
  return { id: res.data.data.id, name: res.data.data.name };
}

/**
 * Inline create from <MasterSelect>. The POST is the same endpoint the management page uses, so a
 * row created here is a first-class master row.
 *
 * On success every query is invalidated rather than a named key: a new master must also appear on
 * that master's own CRUD page, and this module cannot know each page's key factory. Inline creates
 * are rare enough that the extra refetches cost nothing.
 */
function useCreateOption<TInput extends Record<string, string>>(path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => createOption(path, input),
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
}

export function useCreateCategoryOption() {
  return useCreateOption<{ name: string }>('/masters/categories');
}

export function useCreateMakeOption() {
  return useCreateOption<{ name: string; categoryId: string }>('/masters/makes');
}

export function useCreateModelOption() {
  return useCreateOption<{ name: string; makeId: string }>('/masters/models');
}

export function useCreateSupplierOption() {
  return useCreateOption<{ name: string }>('/masters/suppliers');
}
