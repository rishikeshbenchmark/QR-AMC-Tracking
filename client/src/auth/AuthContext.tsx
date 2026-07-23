import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { setUnauthorizedHandler } from '@/api/client';

import * as authApi from './auth.api';
import { clearToken, getToken, setToken } from './token';
import type { AuthUser } from './types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Permission-code check — the client mirror of the server's requirePermission guard. */
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Rehydrate on load: a stored token is only trusted after /auth/me confirms it is still valid.
  useEffect(() => {
    let active = true;
    if (!getToken()) {
      setStatus('unauthenticated');
      return;
    }
    authApi
      .fetchCurrentUser()
      .then((current) => {
        if (!active) return;
        setUser(current);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!active) return;
        clearToken();
        setUser(null);
        setStatus('unauthenticated');
      });
    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus('unauthenticated');
    navigate('/login', { replace: true });
  }, [navigate]);

  // A 401 from any request (expired/revoked session) drops us to the login screen via the router.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('unauthenticated');
      navigate('/login', { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: authUser } = await authApi.login(email, password);
    setToken(token);
    setUser(authUser);
    setStatus('authenticated');
  }, []);

  const can = useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout, can }),
    [user, status, login, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
