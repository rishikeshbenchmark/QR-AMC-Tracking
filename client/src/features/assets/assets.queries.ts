import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as assetsApi from './assets.api';
import type { ListAssetsParams } from './assets.api';
import type { ChangeStatusFormValues, RegisterAssetFormValues } from './assets.schemas';

/** Query-key factory — every asset cache entry hangs off this root so one call invalidates all. */
export const assetKeys = {
  all: ['assets'] as const,
  list: (params: ListAssetsParams) => [...assetKeys.all, 'list', params] as const,
  detail: (id: string) => [...assetKeys.all, 'detail', id] as const,
};

export function useAssets(params: ListAssetsParams) {
  return useQuery({
    queryKey: assetKeys.list(params),
    queryFn: () => assetsApi.listAssets(params),
    // Keep the previous page visible while the next page/search/filter loads — no flash to empty.
    placeholderData: keepPreviousData,
  });
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: assetKeys.detail(id ?? ''),
    queryFn: () => assetsApi.getAsset(id as string),
    enabled: id !== undefined,
  });
}

export function useRegisterAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterAssetFormValues) => assetsApi.registerAsset(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export function useChangeAssetStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ChangeStatusFormValues }) =>
      assetsApi.changeAssetStatus(id, input),
    onSuccess: () => {
      // Both the detail (new status + a new history row) and any list page are now stale.
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}
