import { apiClient } from '@/api/client';

import type { CustomerFormValues, CustomerSortField } from './customers.schemas';
import type { SortOrder } from '@/components/DataTable';

/** Mirrors the server's CustomerDto. Dates arrive as ISO strings over JSON. */
export interface Customer {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ListCustomersParams {
  page: number;
  limit: number;
  search?: string;
  sort: CustomerSortField;
  order: SortOrder;
}

interface ListEnvelope<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

interface ItemEnvelope<T> {
  data: T;
}

export interface CustomerList {
  customers: Customer[];
  meta: { page: number; limit: number; total: number };
}

const BASE_PATH = '/masters/customers';

export async function listCustomers(params: ListCustomersParams): Promise<CustomerList> {
  const res = await apiClient.get<ListEnvelope<Customer>>(BASE_PATH, {
    // Drop an empty search so the server sees no param rather than an empty string.
    params: { ...params, search: params.search || undefined },
  });
  return { customers: res.data.data, meta: res.data.meta };
}

export async function createCustomer(input: CustomerFormValues): Promise<Customer> {
  const res = await apiClient.post<ItemEnvelope<Customer>>(BASE_PATH, input);
  return res.data.data;
}

export async function updateCustomer(id: string, input: CustomerFormValues): Promise<Customer> {
  const res = await apiClient.put<ItemEnvelope<Customer>>(`${BASE_PATH}/${id}`, input);
  return res.data.data;
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${id}`);
}