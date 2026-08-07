import type { RequestHandler } from 'express';

import { getAuthUser } from '@/middlewares/auth.middleware';

import * as modelsService from './models.service';
import type {
  CreateModelInput,
  ListModelsQuery,
  ModelIdParam,
  UpdateModelInput,
} from './models.schemas';

/** GET /masters/models — paginated, searchable, optionally make-filtered list. */
export const list: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const result = await modelsService.listModels(user, req.query as unknown as ListModelsQuery);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/** GET /masters/models/:id */
export const getOne: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as ModelIdParam;
    const model = await modelsService.getModel(user, id);
    res.status(200).json({ data: model });
  } catch (error) {
    next(error);
  }
};

/** POST /masters/models — also the on-the-fly create path used by <MasterSelect>. */
export const create: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const model = await modelsService.createModel(user, req.body as CreateModelInput);
    res.status(201).json({ data: model });
  } catch (error) {
    next(error);
  }
};

/** PUT /masters/models/:id */
export const update: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as ModelIdParam;
    const model = await modelsService.updateModel(user, id, req.body as UpdateModelInput);
    res.status(200).json({ data: model });
  } catch (error) {
    next(error);
  }
};

/** DELETE /masters/models/:id — soft delete, returns 204. */
export const remove: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as ModelIdParam;
    await modelsService.deleteModel(user, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
