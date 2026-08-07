import type { RequestHandler } from 'express';

import { getAuthUser } from '@/middlewares/auth.middleware';

import * as amcSuppliersService from './amc-suppliers.service';
import type {
  AmcSupplierIdParam,
  CreateAmcSupplierInput,
  ListAmcSuppliersQuery,
  UpdateAmcSupplierInput,
} from './amc-suppliers.schemas';

/** GET /masters/amc-suppliers */
export const list: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const result = await amcSuppliersService.listAmcSuppliers(
      user,
      req.query as unknown as ListAmcSuppliersQuery,
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/** GET /masters/amc-suppliers/:id */
export const getOne: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as AmcSupplierIdParam;
    const amcSupplier = await amcSuppliersService.getAmcSupplier(user, id);
    res.status(200).json({ data: amcSupplier });
  } catch (error) {
    next(error);
  }
};

/** POST /masters/amc-suppliers */
export const create: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const amcSupplier = await amcSuppliersService.createAmcSupplier(
      user,
      req.body as CreateAmcSupplierInput,
    );
    res.status(201).json({ data: amcSupplier });
  } catch (error) {
    next(error);
  }
};

/** PUT /masters/amc-suppliers/:id */
export const update: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as AmcSupplierIdParam;
    const amcSupplier = await amcSuppliersService.updateAmcSupplier(
      user,
      id,
      req.body as UpdateAmcSupplierInput,
    );
    res.status(200).json({ data: amcSupplier });
  } catch (error) {
    next(error);
  }
};

/** DELETE /masters/amc-suppliers/:id */
export const remove: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as AmcSupplierIdParam;
    await amcSuppliersService.deleteAmcSupplier(user, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};