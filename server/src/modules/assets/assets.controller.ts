import type { RequestHandler } from 'express';

import { getAuthUser } from '@/middlewares/auth.middleware';

import * as assetsService from './assets.service';
import type {
  AssetIdParam,
  ChangeAssetStatusInput,
  CreateAssetInput,
  ListAssetsQuery,
} from './assets.schemas';

/** GET /assets — paginated, filterable, serial-searchable list for the current tenant. */
export const list: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const result = await assetsService.listAssets(user, req.query as unknown as ListAssetsQuery);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/** GET /assets/:id — detail with purchase, status history and the legal next statuses. */
export const getOne: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as AssetIdParam;
    const asset = await assetsService.getAsset(user, id);
    res.status(200).json({ data: asset });
  } catch (error) {
    next(error);
  }
};

/** POST /assets — Purchase Step 1: asset + purchase minted in one transaction. */
export const create: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const asset = await assetsService.createAsset(user, req.body as CreateAssetInput);
    res.status(201).json({ data: asset });
  } catch (error) {
    next(error);
  }
};

/** PATCH /assets/:id/status — the one manual status endpoint (ADR-0003). */
export const changeStatus: RequestHandler = async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const { id } = req.params as AssetIdParam;
    const result = await assetsService.changeAssetStatus(
      user,
      id,
      req.body as ChangeAssetStatusInput,
    );
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};
