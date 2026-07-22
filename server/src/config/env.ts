import 'dotenv/config';

import { z } from 'zod';

/**
 * The only place in the codebase that reads `process.env`.
 * Parsed once at import time; a malformed environment kills the process at boot
 * rather than surfacing as a confusing runtime failure hours later.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Base of every printed QR URL. Frozen permanently once labels are printed.
  PUBLIC_APP_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  // console, not the logger: the logger's own construction depends on this config.
  console.error(`Invalid environment configuration:\n${issues}\n\nSee server/.env.example.`);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
} as const;
