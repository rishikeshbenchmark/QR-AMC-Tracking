import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '@/config/env';

import type { AccessTokenPayload } from './auth.types';

const signOptions: SignOptions = {
  // env.JWT_EXPIRES_IN is validated at boot; the cast narrows string -> the library's union.
  expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, signOptions);
}

/**
 * Verifies signature + expiry and returns the claims, or null on any failure. Callers turn a
 * null into a 401 — this function never throws, so an expired token is not a 500.
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof decoded.userId !== 'string' ||
      typeof decoded.companyId !== 'string' ||
      typeof decoded.roleId !== 'string'
    ) {
      return null;
    }
    return { userId: decoded.userId, companyId: decoded.companyId, roleId: decoded.roleId };
  } catch {
    return null;
  }
}
