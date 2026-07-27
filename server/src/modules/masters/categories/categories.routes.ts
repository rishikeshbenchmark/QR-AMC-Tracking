import { Router } from 'express';

import { requirePermission } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';

import * as categoriesController from './categories.controller';
import {
  categoryIdParamSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from './categories.schemas';

/**
 * Category master routes. Mounted under /masters (which applies `authenticate` once), so the chain
 * per CLAUDE.md is: auth (parent) -> rbac -> validate -> controller. All CRUD is gated on the single
 * `master.manage` permission (Admin + Backoffice). This router is the shape interns clone for the
 * other four masters.
 */
export const categoriesRouter = Router();

const canManageMasters = requirePermission('master.manage');

categoriesRouter.get(
  '/',
  canManageMasters,
  validate(listCategoriesQuerySchema, 'query'),
  categoriesController.list,
);

categoriesRouter.post(
  '/',
  canManageMasters,
  validate(createCategorySchema),
  categoriesController.create,
);

categoriesRouter.get(
  '/:id',
  canManageMasters,
  validate(categoryIdParamSchema, 'params'),
  categoriesController.getOne,
);

categoriesRouter.put(
  '/:id',
  canManageMasters,
  validate(categoryIdParamSchema, 'params'),
  validate(updateCategorySchema),
  categoriesController.update,
);

categoriesRouter.delete(
  '/:id',
  canManageMasters,
  validate(categoryIdParamSchema, 'params'),
  categoriesController.remove,
);
