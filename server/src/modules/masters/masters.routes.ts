import { Router } from 'express';

import { authenticate } from '@/middlewares/auth.middleware';

<<<<<<< HEAD
import { categoriesRouter } from './categories/categories.routes';
import { customersRouter } from './customers/customers.routes';
import { suppliersRouter } from './suppliers/suppliers.routes';
import { amcSuppliersRouter } from './amc-suppliers/amc-suppliers.routes';
import { makesRouter } from './makes/makes.routes';
=======
import { categoriesRouter } from "./categories/categories.routes";
import { customersRouter } from "./customers/customers.routes";
import { suppliersRouter } from "./suppliers/suppliers.routes";
import { makesRouter } from "./makes/makes.routes";
import { modelsRouter } from "./models/models.routes";
>>>>>>> 85897da1f37e964d6b41efce2b4d4405d7b99de8

/**
 * Aggregates the master resources under /masters. `authenticate` runs once here so each resource
 * router only declares its RBAC + validation.
 */
export const mastersRouter = Router();

mastersRouter.use(authenticate);

<<<<<<< HEAD
mastersRouter.use('/categories', categoriesRouter);
mastersRouter.use('/customers', customersRouter);

mastersRouter.use('/suppliers', suppliersRouter);
mastersRouter.use('/amc-suppliers', amcSuppliersRouter);

mastersRouter.use('/makes', makesRouter);
=======
mastersRouter.use("/categories", categoriesRouter);
mastersRouter.use("/customers", customersRouter);
mastersRouter.use("/suppliers", suppliersRouter);
mastersRouter.use("/makes", makesRouter);
mastersRouter.use("/models", modelsRouter);
>>>>>>> 85897da1f37e964d6b41efce2b4d4405d7b99de8
