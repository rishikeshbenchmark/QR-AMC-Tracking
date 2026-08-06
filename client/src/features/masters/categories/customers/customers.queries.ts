import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import * as categoriesApi from './customers.api';
import type { ListCategoriesParams } from './customers.api';
import type { CategoryFormValues } from './customers.schemas';

/** Query-key factory — every category cache entry hangs off this root so one call invalidates all. */
export const categoryKeys = {
  all: ['categories'] as const,
  list: (params: ListCategoriesParams) => [...categoryKeys.all, 'list', params] as const,
};

export function useCategories(params: ListCategoriesParams) {
  return useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: () => categoriesApi.listCategories(params),
    // Keep the previous page visible while the next page/search/sort loads — no flash to empty.
    placeholderData: keepPreviousData,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryFormValues) => categoriesApi.createCategory(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryFormValues }) =>
      categoriesApi.updateCategory(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}
