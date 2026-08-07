import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
<<<<<<< HEAD


import { amcSuppliersRouter } from './amc-suppliers/amc-suppliers.routes';

=======
import { amcSuppliersRouter } from './amc-suppliers/amc-suppliers.routes';
>>>>>>> 9186be7218d629bc57cb5d11c55b795b5b34eee6
import { categoriesRouter } from "./categories/categories.routes";
import { customersRouter } from "./customers/customers.routes";
import { suppliersRouter } from "./suppliers/suppliers.routes";
import { makesRouter } from "./makes/makes.routes";
import { modelsRouter } from "./models/models.routes";
<<<<<<< HEAD

import { amcsuppliersRouter } from './amc-suppliers/amc-suppliers.routes';
=======
>>>>>>> 9186be7218d629bc57cb5d11c55b795b5b34eee6

/**
 * Aggregates the master resources under /masters. `authenticate` runs once here so each resource
 * router only declares its RBAC + validation.
 */
export const mastersRouter = Router();

mastersRouter.use(authenticate);
<<<<<<< HEAD

=======
>>>>>>> 9186be7218d629bc57cb5d11c55b795b5b34eee6
mastersRouter.use('/categories', categoriesRouter);
mastersRouter.use('/customers', customersRouter);
mastersRouter.use('/suppliers', suppliersRouter);
mastersRouter.use('/amc-suppliers', amcSuppliersRouter);
mastersRouter.use('/makes', makesRouter);
mastersRouter.use("/categories", categoriesRouter);
mastersRouter.use("/customers", customersRouter);
mastersRouter.use("/suppliers", suppliersRouter);
mastersRouter.use("/makes", makesRouter);
mastersRouter.use("/models", modelsRouter);
<<<<<<< HEAD

=======
>>>>>>> 9186be7218d629bc57cb5d11c55b795b5b34eee6
