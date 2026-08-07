import { Router } from 'express';

<<<<<<< HEAD
<<<<<<< HEAD

=======
<<<<<<< HEAD
=======
import { authenticate } from '@/middlewares/auth.middleware';


>>>>>>> 18d26f0670a1e0dafce7c02065346bede683d7f3
import { categoriesRouter } from './categories/categories.routes';
import { customersRouter } from './customers/customers.routes';
import { suppliersRouter } from './suppliers/suppliers.routes';
import { makesRouter } from './makes/makes.routes';
import { modelsRouter } from "./models/models.routes";
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
>>>>>>> 9186be7218d629bc57cb5d11c55b795b5b34eee6
>>>>>>> fa63dcf1f342ff463607edc5713e4c1f30377016
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
<<<<<<< HEAD

import { amcsuppliersRouter } from './amc-suppliers/amc-suppliers.routes';
=======
<<<<<<< HEAD
=======
import { amcSuppliersRouter } from './amc-suppliers/amc-suppliers.routes';
>>>>>>> 326991d7f55b4f7167ac24c4d9b3cf7cd28f2f94

>>>>>>> 10409f7ccb3ca5e9a4b0f13d4b986ea9276e81f7
>>>>>>> fa63dcf1f342ff463607edc5713e4c1f30377016
=======
>>>>>>> 9186be7218d629bc57cb5d11c55b795b5b34eee6
=======
import { amcSuppliersRouter } from './amc-suppliers/amc-suppliers.routes';

>>>>>>> 18d26f0670a1e0dafce7c02065346bede683d7f3

/**
 * Aggregates the master resources under /masters. `authenticate` runs once here so each resource
 * router only declares its RBAC + validation.
 */
export const mastersRouter = Router();

mastersRouter.use(authenticate);
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 9186be7218d629bc57cb5d11c55b795b5b34eee6
=======
<<<<<<< HEAD

=======
<<<<<<< HEAD

=======
>>>>>>> 326991d7f55b4f7167ac24c4d9b3cf7cd28f2f94
>>>>>>> 10409f7ccb3ca5e9a4b0f13d4b986ea9276e81f7
>>>>>>> fa63dcf1f342ff463607edc5713e4c1f30377016
=======
>>>>>>> 18d26f0670a1e0dafce7c02065346bede683d7f3
mastersRouter.use('/categories', categoriesRouter);
mastersRouter.use('/customers', customersRouter);
mastersRouter.use('/models', modelsRouter);
mastersRouter.use('/suppliers', suppliersRouter);
mastersRouter.use('/amc-suppliers', amcSuppliersRouter);

mastersRouter.use('/makes', makesRouter);
mastersRouter.use("/categories", categoriesRouter);
mastersRouter.use("/customers", customersRouter);
mastersRouter.use("/suppliers", suppliersRouter);
mastersRouter.use("/makes", makesRouter);
mastersRouter.use("/models", modelsRouter);
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
<<<<<<< HEAD
=======

>>>>>>> 326991d7f55b4f7167ac24c4d9b3cf7cd28f2f94
>>>>>>> 10409f7ccb3ca5e9a4b0f13d4b986ea9276e81f7
>>>>>>> fa63dcf1f342ff463607edc5713e4c1f30377016
=======
>>>>>>> 9186be7218d629bc57cb5d11c55b795b5b34eee6
=======

>>>>>>> 18d26f0670a1e0dafce7c02065346bede683d7f3
