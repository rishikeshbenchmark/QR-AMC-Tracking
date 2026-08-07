import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import * as makesApi from './makes.api';
import type { ListMakesParams } from './makes.api';
import type { MakeFormValues } from './makes.schemas';

/**
 * Query-key factory — every make cache entry hangs off this root so one call invalidates all.
 * `categoryId` is part of the params object and therefore part of the key, so a filtered page and
 * the unfiltered page are cached (and paginated) independently — never mixed.
 */
export const makeKeys = {
  all: ['makes'] as const,
  list: (params: ListMakesParams) => [...makeKeys.all, 'list', params] as const,
};

export function useMakes(params: ListMakesParams) {
  return useQuery({
    queryKey: makeKeys.list(params),
    queryFn: () => makesApi.listMakes(params),
    // Keep the previous page visible while the next page/search/sort/filter loads — no flash to empty.
    placeholderData: keepPreviousData,
  });
}

export function useCreateMake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MakeFormValues) => makesApi.createMake(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: makeKeys.all });
    },
  });
}

export function useUpdateMake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MakeFormValues }) =>
      makesApi.updateMake(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: makeKeys.all });
    },
  });
}

export function useDeleteMake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => makesApi.deleteMake(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: makeKeys.all });
    },
  });
}
