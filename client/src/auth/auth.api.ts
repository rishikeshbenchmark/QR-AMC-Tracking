import { apiClient } from '@/api/client';

import type { AuthUser } from './types';

interface Envelope<T> {
  data: T;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiClient.post<Envelope<LoginResponse>>('/auth/login', { email, password });
  return res.data.data;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const res = await apiClient.get<Envelope<AuthUser>>('/auth/me');
  return res.data.data;
}
