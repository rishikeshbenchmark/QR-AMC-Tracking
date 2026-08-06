import { Router } from 'express';

import { authenticate } from '@/middlewares/auth.middleware';

import { categoriesRouter } from './categories/categories.routes';
import { suppliersRouter } from './suppliers/suppliers.routes';

/**
 * Aggregates the master resources under /masters. `authenticate` runs once here so each resource
 * router only declares its rbac + validation. Interns add the other four masters by mounting their
 * cloned routers alongside categories — one line each.
 */
export const mastersRouter = Router();

mastersRouter.use(authenticate);

mastersRouter.use('/categories', categoriesRouter);
mastersRouter.use('/suppliers', suppliersRouter);
