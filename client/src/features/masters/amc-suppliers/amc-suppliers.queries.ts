import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import * as amcSuppliersApi from './amc-suppliers.api';
import type { ListAmcSuppliersParams } from './amc-suppliers.api';
import type { AmcSupplierFormValues } from './amc-suppliers.schemas';

/** Query-key factory — every AMC Supplier cache entry hangs off this root. */
export const amcSupplierKeys = {
  all: ['amc-suppliers'] as const,
  list: (params: ListAmcSuppliersParams) =>
    [...amcSupplierKeys.all, 'list', params] as const,
};

export function useAmcSuppliers(params: ListAmcSuppliersParams) {
  return useQuery({
    queryKey: amcSupplierKeys.list(params),
    queryFn: () => amcSuppliersApi.listAmcSuppliers(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateAmcSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AmcSupplierFormValues) =>
      amcSuppliersApi.createAmcSupplier(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: amcSupplierKeys.all,
      });
    },
  });
}

export function useUpdateAmcSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: AmcSupplierFormValues;
    }) => amcSuppliersApi.updateAmcSupplier(id, input),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: amcSupplierKeys.all,
      });
    },
  });
}

export function useDeleteAmcSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      amcSuppliersApi.deleteAmcSupplier(id),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: amcSupplierKeys.all,
      });
    },
  });
}