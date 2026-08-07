import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import * as modelsApi from './models.api';
import type { ListModelsParams } from './models.api';
import type { ModelFormValues } from './models.schemas';

/**
 * Query-key factory — every model cache entry hangs off this root so one call invalidates all.
 * `makeId` is part of the params object and therefore part of the key, so filtering by make and
 * paging through the filtered result is a distinct, correctly-cached query — never mixed with the
 * unfiltered list (docs/tasks/makes-and-models.md: page 2 of an unfiltered list is not page 2 of a
 * filtered one).
 */
export const modelKeys = {
  all: ['models'] as const,
  list: (params: ListModelsParams) => [...modelKeys.all, 'list', params] as const,
};

export function useModels(params: ListModelsParams) {
  return useQuery({
    queryKey: modelKeys.list(params),
    queryFn: () => modelsApi.listModels(params),
    // Keep the previous page visible while the next page/search/sort/filter loads — no flash to empty.
    placeholderData: keepPreviousData,
  });
}

export function useCreateModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ModelFormValues) => modelsApi.createModel(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: modelKeys.all });
    },
  });
}

export function useUpdateModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ModelFormValues }) =>
      modelsApi.updateModel(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: modelKeys.all });
    },
  });
}

export function useDeleteModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => modelsApi.deleteModel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: modelKeys.all });
    },
  });
}
