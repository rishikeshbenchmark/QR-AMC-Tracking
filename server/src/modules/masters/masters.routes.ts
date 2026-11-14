import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';

import { amcSuppliersRouter } from './amc-suppliers/amc-suppliers.routes';
import { categoriesRouter } from './categories/categories.routes';
import { customersRouter } from './customers/customers.routes';
import { makesRouter } from './makes/makes.routes';
import { modelsRouter } from './models/models.routes';
import { suppliersRouter } from './suppliers/suppliers.routes';

/**
 * Aggregates the master resources under /masters. `authenticate` runs once here so each resource
 * router only declares its rbac + validation. Every resource is the same six-file shape; categories
 * is the reference the others were cloned from.
 */
export const mastersRouter = Router();

mastersRouter.use(authenticate);

mastersRouter.use('/categories', categoriesRouter);
mastersRouter.use('/makes', makesRouter);
mastersRouter.use('/models', modelsRouter);
mastersRouter.use('/suppliers', suppliersRouter);
mastersRouter.use('/amc-suppliers', amcSuppliersRouter);
mastersRouter.use('/customers', customersRouter);
