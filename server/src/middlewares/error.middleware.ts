import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import { AppError, type ErrorDetail } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} does not exist.`));
};

const toDetails = (error: ZodError): ErrorDetail[] =>
  error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    issue: issue.message,
  }));

/**
 * The single place an error becomes an HTTP response. Registered last, after every route.
 * Express needs all four parameters to recognise this as an error handler — do not trim `_next`.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    // Client mistakes are noise at error level; genuine server-side AppErrors are not.
    const level = err.statusCode >= 500 ? 'error' : 'warn';
    logger[level](
      { requestId: req.id, code: err.code, statusCode: err.statusCode, path: req.originalUrl },
      err.message,
    );
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request could not be processed. Check the highlighted fields.',
        details: toDetails(err),
      },
    });
    return;
  }

  // Anything reaching here is a bug. Log it fully; tell the client nothing.
  logger.error(
    { err, requestId: req.id, method: req.method, path: req.originalUrl },
    'Unhandled error',
  );
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
  });
};
