import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { categoriesRouter } from './categories/categories.routes';
import { customersRouter } from './customers/customers.routes';
import { suppliersRouter } from './suppliers/suppliers.routes';
import { amcSuppliersRouter } from './amc-suppliers/amc-suppliers.routes';
import { makesRouter } from './makes/makes.routes';
import { modelsRouter } from "./models/models.routes";

/**
 * Aggregates the master resources under /masters. `authenticate` runs once here so each resource
 * router only declares its RBAC + validation.
 */
export const mastersRouter = Router();

mastersRouter.use(authenticate);

mastersRouter.use('/categories', categoriesRouter);
mastersRouter.use('/customers', customersRouter);
mastersRouter.use('/models', modelsRouter);
mastersRouter.use('/suppliers', suppliersRouter);
mastersRouter.use('/amc-suppliers', amcSuppliersRouter);
mastersRouter.use('/makes', makesRouter);
mastersRouter.use("/suppliers", suppliersRouter);
mastersRouter.use("/makes", makesRouter);
