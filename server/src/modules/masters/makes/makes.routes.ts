import { Router } from 'express';

import { requirePermission } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';

import * as makesController from './makes.controller';
import {
  createMakeSchema,
  listMakesQuerySchema,
  makeIdParamSchema,
  updateMakeSchema,
} from './makes.schemas';

/**
 * Make master routes. Mounted under /masters (which applies `authenticate` once), so the chain per
 * CLAUDE.md is: auth (parent) -> rbac -> validate -> controller. All CRUD is gated on the single
 * `master.manage` permission (Admin + Backoffice).
 */
export const makesRouter = Router();

const canManageMasters = requirePermission('master.manage');

makesRouter.get(
  '/',
  canManageMasters,
  validate(listMakesQuerySchema, 'query'),
  makesController.list,
);

makesRouter.post(
  '/',
  canManageMasters,
  validate(createMakeSchema),
  makesController.create,
);

makesRouter.get(
  '/:id',
  canManageMasters,
  validate(makeIdParamSchema, 'params'),
  makesController.getOne,
);

makesRouter.put(
  '/:id',
  canManageMasters,
  validate(makeIdParamSchema, 'params'),
  validate(updateMakeSchema),
  makesController.update,
);

makesRouter.delete(
  '/:id',
  canManageMasters,
  validate(makeIdParamSchema, 'params'),
  makesController.remove,
);
