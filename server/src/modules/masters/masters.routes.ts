import { Router } from 'express';

import { authenticate } from '@/middlewares/auth.middleware';

import { categoriesRouter } from './categories/categories.routes';
import { customersRouter } from './customers/customers.routes';
import { suppliersRouter } from './suppliers/suppliers.routes';
import { makesRouter } from './makes/makes.routes';

<<<<<<< HEAD
=======

>>>>>>> 7bfe91143733998607d34840cace684ebea91c19
/**
 * Aggregates the master resources under /masters. `authenticate` runs once here so each resource
 * router only declares its rbac + validation. Interns add the other four masters by mounting their
 * cloned routers alongside categories — one line each.
 */
export const mastersRouter = Router();

mastersRouter.use(authenticate);

mastersRouter.use('/categories', categoriesRouter);
mastersRouter.use('/customers', customersRouter);
<<<<<<< HEAD

mastersRouter.use('/suppliers', suppliersRouter);
mastersRouter.use('/makes', makesRouter);
=======
mastersRouter.use('/suppliers', suppliersRouter);
mastersRouter.use('/makes', makesRouter);
>>>>>>> 7bfe91143733998607d34840cace684ebea91c19
