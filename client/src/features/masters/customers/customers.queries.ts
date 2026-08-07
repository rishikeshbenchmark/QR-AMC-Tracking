import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import * as customersApi from './customers.api';
import type { ListCustomersParams } from './customers.api';
import type { CustomerFormValues } from './customers.schemas';

/** Query-key factory — every customer cache entry hangs off this root so one call invalidates all. */
export const customerKeys = {
  all: ['customers'] as const,
  list: (params: ListCustomersParams) => [...customerKeys.all, 'list', params] as const,
};

export function useCustomers(params: ListCustomersParams) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => customersApi.listCustomers(params),
    // Keep the previous page visible while the next page/search/sort loads — no flash to empty.
    placeholderData: keepPreviousData,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerFormValues) => customersApi.createCustomer(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomerFormValues }) =>
      customersApi.updateCustomer(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersApi.deleteCustomer(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}