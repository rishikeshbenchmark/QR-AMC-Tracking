import { Router } from 'express';

import { authenticate } from '@/middlewares/auth.middleware';
import { requirePermission } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';

import * as assetsController from './assets.controller';
import {
  assetIdParamSchema,
  changeAssetStatusSchema,
  createAssetSchema,
  listAssetsQuerySchema,
} from './assets.schemas';

/**
 * Asset routes. Chain per CLAUDE.md: auth -> rbac -> validate -> controller. Permissions are
 * separate on purpose — Staff hold `asset.read` only, so they can find and view an asset but cannot
 * register one or move its status.
 */
export const assetsRouter = Router();

assetsRouter.use(authenticate);

assetsRouter.get(
  '/',
  requirePermission('asset.read'),
  validate(listAssetsQuerySchema, 'query'),
  assetsController.list,
);

assetsRouter.post(
  '/',
  requirePermission('asset.create'),
  validate(createAssetSchema),
  assetsController.create,
);

assetsRouter.get(
  '/:id',
  requirePermission('asset.read'),
  validate(assetIdParamSchema, 'params'),
  assetsController.getOne,
);

assetsRouter.patch(
  '/:id/status',
  requirePermission('asset.status.change'),
  validate(assetIdParamSchema, 'params'),
  validate(changeAssetStatusSchema),
  assetsController.changeStatus,
);
