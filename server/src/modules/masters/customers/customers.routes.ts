import { Router } from 'express';

import { requirePermission } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';

import * as customersController from './customers.controller';
import {
  createCustomerSchema,
  customerIdParamSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from './customers.schemas';

/**
 * Customer master routes. Mounted under /masters (which applies `authenticate` once), so the chain
 * is auth (parent) -> rbac -> validate -> controller. All CRUD is gated on `master.manage`.
 */
export const customersRouter = Router();

const canManageMasters = requirePermission('master.manage');

customersRouter.get(
  '/',
  canManageMasters,
  validate(listCustomersQuerySchema, 'query'),
  customersController.list,
);

customersRouter.post(
  '/',
  canManageMasters,
  validate(createCustomerSchema),
  customersController.create,
);

customersRouter.get(
  '/:id',
  canManageMasters,
  validate(customerIdParamSchema, 'params'),
  customersController.getOne,
);

customersRouter.put(
  '/:id',
  canManageMasters,
  validate(customerIdParamSchema, 'params'),
  validate(updateCustomerSchema),
  customersController.update,
);

customersRouter.delete(
  '/:id',
  canManageMasters,
  validate(customerIdParamSchema, 'params'),
  customersController.remove,
);
