import type { RequestHandler } from 'express';

import { getAuthUser } from '@/middlewares/auth.middleware';

import * as makesService from './makes.service';
import type {
  CreateMakeInput,
  ListMakesQuery,
  MakeIdParam,
  UpdateMakeInput,
} from './makes.schemas';

/** GET /masters/makes — paginated, searchable, optionally category-filtered list. */
export const list: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const result = await makesService.listMakes(user, req.query as unknown as ListMakesQuery);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/** GET /masters/makes/:id */
export const getOne: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as MakeIdParam;
    const make = await makesService.getMake(user, id);
    res.status(200).json({ data: make });
  } catch (error) {
    next(error);
  }
};

/** POST /masters/makes — also the on-the-fly create path used by <MasterSelect>. */
export const create: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const make = await makesService.createMake(user, req.body as CreateMakeInput);
    res.status(201).json({ data: make });
  } catch (error) {
    next(error);
  }
};

/** PUT /masters/makes/:id */
export const update: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as MakeIdParam;
    const make = await makesService.updateMake(user, id, req.body as UpdateMakeInput);
    res.status(200).json({ data: make });
  } catch (error) {
    next(error);
  }
};

/** DELETE /masters/makes/:id — soft delete, returns 204. */
export const remove: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as MakeIdParam;
    await makesService.deleteMake(user, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
