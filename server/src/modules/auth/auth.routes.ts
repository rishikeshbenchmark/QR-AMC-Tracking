import { Router } from 'express';

import { authenticate } from '@/middlewares/auth.middleware';
import { loginRateLimiter } from '@/middlewares/rateLimit.middleware';
import { validate } from '@/middlewares/validate.middleware';

import * as authController from './auth.controller';
import { loginSchema } from './auth.schemas';

// Middleware order per CLAUDE.md: rateLimit -> auth -> rbac -> validate -> controller.
export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, validate(loginSchema), authController.login);
authRouter.get('/me', authenticate, authController.me);
