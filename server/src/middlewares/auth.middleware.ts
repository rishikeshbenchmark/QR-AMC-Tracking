import type { Request, RequestHandler } from 'express';

import { getAuthenticatedUser } from '@/modules/auth/auth.service';
import { verifyAccessToken } from '@/modules/auth/auth.tokens';
import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { AppError } from '@/shared/errors/AppError';

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token.trim() || null;
}

/**
 * Verifies the bearer token, then reloads the user so identity, role, and permissions are always
 * current (see auth.service.getAuthenticatedUser). Populates `req.user`. Runs after `rateLimit`
 * and before `rbac`/`validate` in the fixed middleware order.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw AppError.unauthorized();
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      throw AppError.unauthorized('Your session is invalid or has expired. Please log in again.');
    }

    const user = await getAuthenticatedUser(payload.userId);
    if (!user) {
      throw AppError.unauthorized('Your session is no longer valid. Please log in again.');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Narrowing accessor for controllers on authed routes: `req.user` is optional at the type level,
 * but `authenticate` guarantees it. Throws (rather than returning undefined) if wired wrongly.
 */
export function getAuthUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  return req.user;
}
