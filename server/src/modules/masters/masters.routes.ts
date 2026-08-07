import { Router } from 'express';

import { authenticate } from '@/middlewares/auth.middleware';

<<<<<<< HEAD
import { categoriesRouter } from './categories/categories.routes';
import { customersRouter } from './customers/customers.routes';
import { suppliersRouter } from './suppliers/suppliers.routes';
import { amcSuppliersRouter } from './amc-suppliers/amc-suppliers.routes';
import { makesRouter } from './makes/makes.routes';
import { modelsRouter } from "./models/models.routes";
=======
<<<<<<< HEAD
import { amcSuppliersRouter } from './amc-suppliers/amc-suppliers.routes';
=======

>>>>>>> 326991d7f55b4f7167ac24c4d9b3cf7cd28f2f94
import { categoriesRouter } from "./categories/categories.routes";
import { customersRouter } from "./customers/customers.routes";
import { suppliersRouter } from "./suppliers/suppliers.routes";
import { makesRouter } from "./makes/makes.routes";
import { modelsRouter } from "./models/models.routes";
<<<<<<< HEAD
=======
import { amcSuppliersRouter } from './amc-suppliers/amc-suppliers.routes';
>>>>>>> 326991d7f55b4f7167ac24c4d9b3cf7cd28f2f94

>>>>>>> 10409f7ccb3ca5e9a4b0f13d4b986ea9276e81f7

/**
 * Aggregates the master resources under /masters. `authenticate` runs once here so each resource
 * router only declares its RBAC + validation.
 */
export const mastersRouter = Router();

mastersRouter.use(authenticate);
<<<<<<< HEAD

=======
<<<<<<< HEAD

=======
>>>>>>> 326991d7f55b4f7167ac24c4d9b3cf7cd28f2f94
>>>>>>> 10409f7ccb3ca5e9a4b0f13d4b986ea9276e81f7
mastersRouter.use('/categories', categoriesRouter);
mastersRouter.use('/customers', customersRouter);
mastersRouter.use('/models', modelsRouter);
mastersRouter.use('/suppliers', suppliersRouter);
mastersRouter.use('/amc-suppliers', amcSuppliersRouter);

mastersRouter.use('/makes', makesRouter);
<<<<<<< HEAD
=======
mastersRouter.use("/categories", categoriesRouter);
mastersRouter.use("/customers", customersRouter);
mastersRouter.use("/suppliers", suppliersRouter);
mastersRouter.use("/makes", makesRouter);
mastersRouter.use("/models", modelsRouter);
<<<<<<< HEAD
=======

>>>>>>> 326991d7f55b4f7167ac24c4d9b3cf7cd28f2f94
>>>>>>> 10409f7ccb3ca5e9a4b0f13d4b986ea9276e81f7
