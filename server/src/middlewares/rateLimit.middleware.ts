import rateLimit from 'express-rate-limit';

import { AppError } from '@/shared/errors/AppError';

/**
 * Brute-force guard on POST /auth/login (CLAUDE.md Security: mandatory). Keyed by IP; a burst of
 * failed logins from one source is throttled without affecting other users. The handler routes
 * through AppError so the 429 uses the standard error envelope, not express-rate-limit's default.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new AppError(
        429,
        'RATE_LIMITED',
        'Too many login attempts. Please wait a few minutes and try again.',
      ),
    );
  },
});
