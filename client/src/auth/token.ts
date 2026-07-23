/**
 * The JWT is held in localStorage and sent in the Authorization header (CLAUDE.md: header bearer,
 * not cookies — which is what makes classic CSRF inapplicable). This is the single module that
 * knows the storage key, so a change to how the token is persisted touches one place.
 */
const TOKEN_KEY = 'qr-amc.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
