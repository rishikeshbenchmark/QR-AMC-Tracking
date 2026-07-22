import { app } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/shared/logger';

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, `API listening on http://localhost:${env.PORT}`);
});

/** Stop accepting connections, let in-flight requests finish, then exit. */
const shutdown = (signal: string): void => {
  logger.info({ signal }, 'Shutting down');

  const forceExit = setTimeout(() => {
    logger.error('Shutdown timed out after 10s; forcing exit');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error while closing the server');
      process.exit(1);
    }
    logger.info('Shutdown complete');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});
