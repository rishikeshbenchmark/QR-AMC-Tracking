import pino from 'pino';

import { env } from '@/config/env';

/**
 * `redact` is a safety net, not a licence to log payloads: never pass a request
 * body, a password, a token or a cost price to the logger in the first place.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'password_hash',
      'token',
      'costPrice',
      'cost_price',
      '*.password',
      '*.passwordHash',
      '*.costPrice',
    ],
    censor: '[redacted]',
  },
  ...(env.isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
});
