import type { RequestHandler } from 'express';

import { getAuthUser } from '@/middlewares/auth.middleware';

import * as categoriesService from './categories.service';
import type {
  CategoryIdParam,
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from './categories.schemas';

/** GET /masters/categories — paginated, searchable list for the current tenant. */
export const list: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const result = await categoriesService.listCategories(user, req.query as unknown as ListCategoriesQuery);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/** GET /masters/categories/:id */
export const getOne: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as CategoryIdParam;
    const category = await categoriesService.getCategory(user, id);
    res.status(200).json({ data: category });
  } catch (error) {
    next(error);
  }
};

/** POST /masters/categories — also the on-the-fly create used by <MasterSelect>. */
export const create: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const category = await categoriesService.createCategory(user, req.body as CreateCategoryInput);
    res.status(201).json({ data: category });
  } catch (error) {
    next(error);
  }
};

/** PUT /masters/categories/:id */
export const update: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as CategoryIdParam;
    const category = await categoriesService.updateCategory(user, id, req.body as UpdateCategoryInput);
    res.status(200).json({ data: category });
  } catch (error) {
    next(error);
  }
};

/** DELETE /masters/categories/:id — soft delete, returns 204. */
export const remove: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as CategoryIdParam;
    await categoriesService.deleteCategory(user, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
