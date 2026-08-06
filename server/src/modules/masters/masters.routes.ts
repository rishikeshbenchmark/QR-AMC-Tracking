import { Router } from 'express';

import { authenticate } from '@/middlewares/auth.middleware';

import { categoriesRouter } from './categories/categories.routes';
<<<<<<< HEAD
import { customersRouter } from './customers/customers.routes';
=======
import { suppliersRouter } from './suppliers/suppliers.routes';
import { makesRouter } from './makes/makes.routes';

>>>>>>> 79a09f1f6e70225747ed3902ced223e387f49efa
/**
 * Aggregates the master resources under /masters. `authenticate` runs once here so each resource
 * router only declares its rbac + validation. Interns add the other four masters by mounting their
 * cloned routers alongside categories — one line each.
 */
export const mastersRouter = Router();

mastersRouter.use(authenticate);

mastersRouter.use('/categories', categoriesRouter);
<<<<<<< HEAD
mastersRouter.use('/customers', customersRouter);
=======
mastersRouter.use('/suppliers', suppliersRouter);
mastersRouter.use('/makes', makesRouter);
>>>>>>> 79a09f1f6e70225747ed3902ced223e387f49efa
