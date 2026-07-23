import type { RequestHandler } from 'express';

import { getAuthUser } from '@/middlewares/auth.middleware';

import * as authService from './auth.service';
import type { LoginInput } from './auth.schemas';

/** POST /auth/login — body already validated by `validate(loginSchema)`. */
export const login: RequestHandler = async (req, res, next) => {
  try {
    const result = await authService.login(req.body as LoginInput);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};

/** GET /auth/me — the current identity, for the client to rehydrate its session on load. */
export const me: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = getAuthUser(req);
    const user = await authService.getCurrentUser(userId);
    res.status(200).json({ data: user });
  } catch (error) {
    next(error);
  }
};
