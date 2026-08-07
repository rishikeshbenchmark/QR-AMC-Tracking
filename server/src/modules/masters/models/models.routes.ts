import { Router } from 'express';

import { requirePermission } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';

import * as modelsController from './models.controller';
import {
  createModelSchema,
  listModelsQuerySchema,
  modelIdParamSchema,
  updateModelSchema,
} from './models.schemas';

/**
 * Model master routes. Mounted under /masters (which applies `authenticate` once), so the chain per
 * CLAUDE.md is: auth (parent) -> rbac -> validate -> controller. All CRUD is gated on the single
 * `master.manage` permission (Admin + Backoffice).
 */
export const modelsRouter = Router();

const canManageMasters = requirePermission('master.manage');

modelsRouter.get(
  '/',
  canManageMasters,
  validate(listModelsQuerySchema, 'query'),
  modelsController.list,
);

modelsRouter.post(
  '/',
  canManageMasters,
  validate(createModelSchema),
  modelsController.create,
);

modelsRouter.get(
  '/:id',
  canManageMasters,
  validate(modelIdParamSchema, 'params'),
  modelsController.getOne,
);

modelsRouter.put(
  '/:id',
  canManageMasters,
  validate(modelIdParamSchema, 'params'),
  validate(updateModelSchema),
  modelsController.update,
);

modelsRouter.delete(
  '/:id',
  canManageMasters,
  validate(modelIdParamSchema, 'params'),
  modelsController.remove,
);
