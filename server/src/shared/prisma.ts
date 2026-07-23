import { PrismaClient } from '@prisma/client';

import { env } from '@/config/env';

/**
 * The ONE PrismaClient for the whole process (CLAUDE.md). Every repository imports this
 * instance — never `new PrismaClient()` in a module, which would open a second pool.
 */
export const prisma = new PrismaClient({
  log: env.isProduction ? ['warn', 'error'] : ['warn', 'error'],
});
