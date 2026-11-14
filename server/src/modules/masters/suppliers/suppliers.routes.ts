import { Router } from 'express';

import { requirePermission } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';

import * as suppliersController from './suppliers.controller';
import {
  createSupplierSchema,
  listSuppliersQuerySchema,
  supplierIdParamSchema,
  updateSupplierSchema,
} from './suppliers.schemas';

/**
 * Supplier master routes. Mounted under /masters (which applies `authenticate` once), so the chain
 * is auth (parent) -> rbac -> validate -> controller. All CRUD is gated on `master.manage`.
 */
export const suppliersRouter = Router();

const canManageMasters = requirePermission('master.manage');

suppliersRouter.get(
  '/',
  canManageMasters,
  validate(listSuppliersQuerySchema, 'query'),
  suppliersController.list,
);

suppliersRouter.post(
  '/',
  canManageMasters,
  validate(createSupplierSchema),
  suppliersController.create,
);

suppliersRouter.get(
  '/:id',
  canManageMasters,
  validate(supplierIdParamSchema, 'params'),
  suppliersController.getOne,
);

suppliersRouter.put(
  '/:id',
  canManageMasters,
  validate(supplierIdParamSchema, 'params'),
  validate(updateSupplierSchema),
  suppliersController.update,
);

suppliersRouter.delete(
  '/:id',
  canManageMasters,
  validate(supplierIdParamSchema, 'params'),
  suppliersController.remove,
);
