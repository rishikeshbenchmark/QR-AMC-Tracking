import type { RequestHandler } from 'express';

import { getAuthUser } from '@/middlewares/auth.middleware';

import * as categoriesService from './customers.service';
import type {
  CustomerIdParam,
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from './customers.schemas';

/** GET /masters/customers — paginated, searchable list for the current tenant. */
export const list: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const result = await categoriesService.listCustomers(user, req.query as unknown as ListCustomersQuery);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/** GET /masters/customers/:id */
export const getOne: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as CustomerIdParam;
    const customer = await categoriesService.getCustomer(user, id);
    res.status(200).json({ data: customer });
  } catch (error) {
    next(error);
  }
};

/** POST /masters/customers — also the on-the-fly create used by <MasterSelect>. */
export const create: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const customer = await categoriesService.createCustomer(user, req.body as CreateCustomerInput);
    res.status(201).json({ data: customer });
  } catch (error) {
    next(error);
  }
};

/** PUT /masters/customers/:id */
export const update: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as CustomerIdParam;
    const customer = await categoriesService.updateCustomer(user, id, req.body as UpdateCustomerInput);
    res.status(200).json({ data: customer });
  } catch (error) {
    next(error);
  }
};

/** DELETE /masters/customers/:id — soft delete, returns 204. */
export const remove: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as CustomerIdParam;
    await categoriesService.deleteCustomer(user, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
