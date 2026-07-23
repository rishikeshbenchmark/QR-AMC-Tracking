import { prisma } from '@/shared/prisma';

/**
 * The include that pulls a user together with their role and that role's permission codes.
 * Both reads below share it so the mapper in the service has one predictable shape.
 */
const withRoleAndPermissions = {
  role: {
    include: {
      permissions: { include: { permission: { select: { code: true } } } },
    },
  },
} as const;

export type UserWithPermissions = NonNullable<
  Awaited<ReturnType<typeof findByEmail>>
>;

/** Live (non-deleted) user by email, including inactive accounts so login can message them. */
export function findByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email, isDeleted: false },
    include: withRoleAndPermissions,
  });
}

/** Live, active user by id — the per-request identity source for the auth middleware. */
export function findActiveById(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, isDeleted: false, isActive: true },
    include: withRoleAndPermissions,
  });
}
