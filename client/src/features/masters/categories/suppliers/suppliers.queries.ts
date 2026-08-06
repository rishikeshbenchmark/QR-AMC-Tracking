import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import * as suppliersApi from './suppliers.api';
import type { ListSuppliersParams } from './suppliers.api';
import type { SupplierFormValues } from './suppliers.schemas';
/** Query-key factory — every supplier cache entry hangs off this root so one call invalidates all. */
export const supplierKeys = {
  all: ['suppliers'] as const,
  list: (params: ListSuppliersParams) => [...supplierKeys.all, 'list', params] as const,
};

export function useSuppliers(params: ListSuppliersParams) {
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: () => suppliersApi.listSuppliers(params),
    // Keep the previous page visible while the next page/search/sort loads — no flash to empty.
    placeholderData: keepPreviousData,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SupplierFormValues) => suppliersApi.createSupplier(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupplierFormValues }) =>
      suppliersApi.updateSupplier(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suppliersApi.deleteSupplier(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}
