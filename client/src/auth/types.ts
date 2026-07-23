/** Mirrors the server's UserDto (modules/auth/auth.types.ts). Never carries a password hash. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  companyId: string;
  role: string;
  permissions: string[];
}
