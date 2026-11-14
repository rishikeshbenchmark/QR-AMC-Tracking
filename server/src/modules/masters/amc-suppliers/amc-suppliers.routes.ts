import { Router } from 'express';

import { requirePermission } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';

import * as amcSuppliersController from './amc-suppliers.controller';
import {
  amcSupplierIdParamSchema,
  createAmcSupplierSchema,
  listAmcSuppliersQuerySchema,
  updateAmcSupplierSchema,
} from './amc-suppliers.schemas';

/**
 * AMC-supplier master routes. Mounted under /masters (which applies `authenticate` once), so the
 * chain is auth (parent) -> rbac -> validate -> controller. All CRUD is gated on `master.manage`.
 */
export const amcSuppliersRouter = Router();

const canManageMasters = requirePermission('master.manage');

amcSuppliersRouter.get(
  '/',
  canManageMasters,
  validate(listAmcSuppliersQuerySchema, 'query'),
  amcSuppliersController.list,
);

amcSuppliersRouter.post(
  '/',
  canManageMasters,
  validate(createAmcSupplierSchema),
  amcSuppliersController.create,
);

amcSuppliersRouter.get(
  '/:id',
  canManageMasters,
  validate(amcSupplierIdParamSchema, 'params'),
  amcSuppliersController.getOne,
);

amcSuppliersRouter.put(
  '/:id',
  canManageMasters,
  validate(amcSupplierIdParamSchema, 'params'),
  validate(updateAmcSupplierSchema),
  amcSuppliersController.update,
);

amcSuppliersRouter.delete(
  '/:id',
  canManageMasters,
  validate(amcSupplierIdParamSchema, 'params'),
  amcSuppliersController.remove,
);
