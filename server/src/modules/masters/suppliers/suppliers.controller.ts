import type { RequestHandler } from 'express';

import { getAuthUser } from '@/middlewares/auth.middleware';

import * as suppliersService from './suppliers.service';
import type {
  SupplierIdParam,
  CreateSupplierInput,
  ListSuppliersQuery,
  UpdateSupplierInput,
} from './suppliers.schemas';

/** GET /masters/suppliers — paginated, searchable list for the current tenant. */
export const list: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const result = await suppliersService.listSuppliers(user, req.query as unknown as ListSuppliersQuery);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/** GET /masters/suppliers/:id */
export const getOne: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as SupplierIdParam;
    const supplier = await suppliersService.getSupplier(user, id);
    res.status(200).json({ data: supplier });
  } catch (error) {
    next(error);
  }
};

/** POST /masters/suppliers — also the on-the-fly create used by <MasterSelect>. */
export const create: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const supplier = await suppliersService.createSupplier(user, req.body as CreateSupplierInput);
    res.status(201).json({ data: supplier });
  } catch (error) {
    next(error);
  }
};

/** PUT /masters/suppliers/:id */
export const update: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as SupplierIdParam;
    const supplier = await suppliersService.updateSupplier(user, id, req.body as UpdateSupplierInput);
    res.status(200).json({ data: supplier });
  } catch (error) {
    next(error);
  }
};

/** DELETE /masters/suppliers/:id — soft delete, returns 204. */
export const remove: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as SupplierIdParam;
    await suppliersService.deleteSupplier(user, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
