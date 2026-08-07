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
 * AMC Supplier master routes.
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