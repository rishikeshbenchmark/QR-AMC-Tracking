import axios, { AxiosError } from 'axios';

import { clearToken, getToken } from '@/auth/token';

/** The API base URL is always an env var, never a literal (CLAUDE.md). */
const baseURL = import.meta.env.VITE_API_BASE_URL;
if (!baseURL) {
  throw new Error('VITE_API_BASE_URL is not set. Copy client/.env.example to client/.env.');
}

export const apiClient = axios.create({ baseURL });

/**
 * A 401 means the session is dead (expired, revoked, or the user was deactivated). The auth layer
 * registers a handler here so the interceptor can clear auth and route to /login through the SPA
 * router rather than a full reload. Kept as a settable callback to avoid an api -> React import cycle.
 */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearToken();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/** The API's error envelope: `{ error: { code, message, details? } }`. */
export interface ApiErrorShape {
  code: string;
  message: string;
  details?: Array<{ field: string; issue: string }>;
}

/** Pull a human-readable message out of an axios error, falling back for network failures. */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data?.error as ApiErrorShape | undefined;
    if (apiError?.message) return apiError.message;
    if (error.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection.';
  }
  return fallback;
}
