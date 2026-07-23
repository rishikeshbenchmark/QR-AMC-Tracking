import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Parses one part of the request against a zod schema and REPLACES it with the parsed value, so
 * downstream code receives trimmed/coerced/typed data, never the raw input. A ZodError propagates
 * to `error.middleware`, which maps it to a 400 with field-level details.
 *
 * Runs last in the middleware chain (after auth/rbac) so validation errors are only ever returned
 * to a caller already allowed to reach the route.
 */
export function validate(schema: ZodSchema, part: RequestPart = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // req.query/params are read-only getters on some Express versions; assign defensively.
    Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true });
    next();
  };
}
