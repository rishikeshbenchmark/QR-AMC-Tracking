import type { RequestHandler } from 'express';

import { AppError } from '@/shared/errors/AppError';

/**
 * Guards a route by permission CODE, never role name (CLAUDE.md). Must run after `authenticate`,
 * which populates `req.user.permissions`. A missing `req.user` is a wiring bug surfaced as 401;
 * an authenticated user lacking the permission gets 403.
 *
 * Field-level rules (e.g. cost-price masking) are NOT enforced here — they live in the service/DTO
 * layer, so an unpermitted user gets a response without the field, not a blocked request.
 */
export function requirePermission(permission: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    if (!req.user.permissions.includes(permission)) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
}
