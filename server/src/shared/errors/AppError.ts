export interface ErrorDetail {
  field: string;
  issue: string;
}

/**
 * The only error type services throw. Controllers never build error responses by
 * hand — `error.middleware.ts` maps this to the wire envelope.
 *
 * `code` is a stable machine string (clients may branch on it); `message` is
 * human-readable and safe to display to an end user.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: ErrorDetail[];

  constructor(statusCode: number, code: string, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, AppError);
  }

  static badRequest(code: string, message: string, details?: ErrorDetail[]): AppError {
    return new AppError(400, code, message, details);
  }

  static unauthorized(message = 'Authentication required.'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have permission to do that.'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  /** Also the correct answer for a record belonging to another tenant — never confirm it exists. */
  static notFound(message = 'Not found.'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(code: string, message: string): AppError {
    return new AppError(409, code, message);
  }

  static unprocessable(code: string, message: string): AppError {
    return new AppError(422, code, message);
  }
}
