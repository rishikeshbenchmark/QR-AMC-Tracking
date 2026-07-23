import type { AuthenticatedUser } from '@/modules/auth/auth.types';

/**
 * Augments Express's Request with the authenticated identity. `user` is optional at the type
 * level because it is absent on public routes and before `auth.middleware` runs; controllers on
 * authed routes read it through `getAuthUser(req)`, which narrows and throws if it is missing.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
