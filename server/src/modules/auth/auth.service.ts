import bcrypt from 'bcryptjs';

import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

import type { LoginInput } from './auth.schemas';
import * as authRepository from './auth.repository';
import type { UserWithPermissions } from './auth.repository';
import { signAccessToken } from './auth.tokens';
import type { AuthenticatedUser, UserDto } from './auth.types';

function permissionCodes(user: UserWithPermissions): string[] {
  return user.role.permissions.map((rp) => rp.permission.code);
}

function toUserDto(user: UserWithPermissions): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    companyId: user.companyId,
    role: user.role.name,
    permissions: permissionCodes(user),
  };
}

function toAuthenticatedUser(user: UserWithPermissions): AuthenticatedUser {
  return {
    userId: user.id,
    companyId: user.companyId,
    roleId: user.roleId,
    roleName: user.role.name,
    name: user.name,
    email: user.email,
    permissions: permissionCodes(user),
  };
}

/**
 * Verify credentials and mint a token. The "no such email" and "wrong password" branches return
 * the SAME generic message on purpose — never reveal whether an email exists (account enumeration).
 */
export async function login(input: LoginInput): Promise<{ token: string; user: UserDto }> {
  const invalidCredentials = AppError.unauthorized('Invalid email or password.');

  const user = await authRepository.findByEmail(input.email);
  if (!user) {
    throw invalidCredentials;
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw invalidCredentials;
  }

  if (!user.isActive) {
    // Reached only after a correct password, so this is not enumeration.
    throw AppError.forbidden('This account has been disabled. Contact an administrator.');
  }

  const token = signAccessToken({
    userId: user.id,
    companyId: user.companyId,
    roleId: user.roleId,
  });

  logger.info({ userId: user.id, companyId: user.companyId }, 'User logged in');
  return { token, user: toUserDto(user) };
}

/**
 * Resolve the current identity from a verified token's userId. Returns null when the user no
 * longer exists, was soft-deleted, or was deactivated after the token was issued — the middleware
 * turns that into a 401 so a revoked user cannot keep using an unexpired token.
 */
export async function getAuthenticatedUser(userId: string): Promise<AuthenticatedUser | null> {
  const user = await authRepository.findActiveById(userId);
  return user ? toAuthenticatedUser(user) : null;
}

/** The current user's client DTO, for GET /auth/me. */
export async function getCurrentUser(userId: string): Promise<UserDto> {
  const user = await authRepository.findActiveById(userId);
  if (!user) {
    throw AppError.unauthorized();
  }
  return toUserDto(user);
}
