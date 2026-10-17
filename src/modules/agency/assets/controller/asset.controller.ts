import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { assetService, type AssetActor } from '../service/asset.service';

function actorFromRequest(req: Request): AssetActor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    fullName: req.user!.email,
  };
}

export const assetController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await assetService.list(req.query, actorFromRequest(req));
    sendPaginated(res, result.items, result.meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const item = await assetService.getById(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const item = await assetService.create(req.body, actorFromRequest(req));
    sendCreated(res, item, 'Asset created');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const item = await assetService.update(String(req.params.id), req.body, actorFromRequest(req));
    sendSuccess(res, item, 'Asset updated');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await assetService.remove(String(req.params.id), actorFromRequest(req));
    sendNoContent(res);
  }),

  restore: asyncHandler(async (req: Request, res: Response) => {
    const item = await assetService.restore(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Asset restored');
  }),
};
