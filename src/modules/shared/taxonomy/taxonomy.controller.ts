import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { TaxonomyService } from './taxonomy.service';

export function createTaxonomyController(service: TaxonomyService<never>) {
  return {
    list: asyncHandler(async (req: Request, res: Response) => {
      const result = await service.list(req.query);
      sendPaginated(res, result.items, result.meta);
    }),

    listPublic: asyncHandler(async (req: Request, res: Response) => {
      const result = await service.listPublic(req.query);
      sendPaginated(res, result.items, result.meta);
    }),

    getPublicBySlug: asyncHandler(async (req: Request, res: Response) => {
      const item = await service.getPublicBySlug(String(req.params.slug));
      sendSuccess(res, item);
    }),

    getById: asyncHandler(async (req: Request, res: Response) => {
      const item = await service.getById(String(req.params.id));
      sendSuccess(res, item);
    }),

    create: asyncHandler(async (req: Request, res: Response) => {
      const item = await service.create(req.body, req.user!.id);
      sendCreated(res, item, 'Created successfully');
    }),

    update: asyncHandler(async (req: Request, res: Response) => {
      const item = await service.update(String(req.params.id), req.body, req.user!.id);
      sendSuccess(res, item, 'Updated successfully');
    }),

    remove: asyncHandler(async (req: Request, res: Response) => {
      await service.softDelete(String(req.params.id), req.user!.id);
      sendNoContent(res);
    }),

    restore: asyncHandler(async (req: Request, res: Response) => {
      const item = await service.restore(String(req.params.id), req.user!.id);
      sendSuccess(res, item, 'Restored successfully');
    }),

    permanentDelete: asyncHandler(async (req: Request, res: Response) => {
      await service.permanentDelete(String(req.params.id), req.user!.id);
      sendNoContent(res);
    }),
  };
}
