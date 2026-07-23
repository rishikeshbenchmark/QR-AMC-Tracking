/**
 * The identity attached to every authenticated request. Built by `auth.middleware` from a
 * verified token plus a fresh DB read, so a disabled or deleted user's old token stops working
 * and a permission change takes effect on the next request (permissions are NOT in the token).
 */
export interface AuthenticatedUser {
  userId: string;
  companyId: string;
  roleId: string;
  roleName: string;
  name: string;
  email: string;
  permissions: string[];
}

/**
 * The signed JWT claims. Deliberately minimal (CLAUDE.md: token carries userId, companyId,
 * roleId) — role name and permissions are resolved from the DB per request, never trusted from
 * the token, so they cannot go stale.
 */
export interface AccessTokenPayload {
  userId: string;
  companyId: string;
  roleId: string;
}

/** The user shape returned to the client by /auth/login and /auth/me. Never carries the hash. */
export interface UserDto {
  id: string;
  name: string;
  email: string;
  companyId: string;
  role: string;
  permissions: string[];
}
