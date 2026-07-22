import { randomUUID } from 'node:crypto';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from '@/config/env';
import { errorHandler, notFoundHandler } from '@/middlewares/error.middleware';
import { logger } from '@/shared/logger';

export const API_PREFIX = '/api/v1';

/** Express assembly only — no `listen()` here, so tests can mount the app directly. */
export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.corsOrigins }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger, genReqId: () => randomUUID() }));

app.get(`${API_PREFIX}/health`, (_req, res) => {
  res.json({ data: { status: 'ok', uptime: Math.round(process.uptime()) } });
});

// Feature routers mount here, between health and the 404 handler.

app.use(notFoundHandler);
app.use(errorHandler);
