import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { serviceService } from '../service/service.service';

export class ServiceController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await serviceService.list(req.query);
    sendPaginated(res, result.services, result.meta);
  });

  listPublished = asyncHandler(async (req: Request, res: Response) => {
    const result = await serviceService.listPublished(req.query);
    sendPaginated(res, result.services, result.meta);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const service = await serviceService.getById(String(req.params.id));
    sendSuccess(res, service);
  });

  getPublishedBySlug = asyncHandler(async (req: Request, res: Response) => {
    const service = await serviceService.getPublishedBySlug(String(req.params.slug));
    sendSuccess(res, service);
  });

  getPublicFeeds = asyncHandler(async (_req: Request, res: Response) => {
    const feeds = await serviceService.getPublicFeeds();
    sendSuccess(res, feeds);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const service = await serviceService.create(req.body, req.user!.id);
    sendCreated(res, service, 'Service created successfully');
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const service = await serviceService.update(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, service, 'Service updated successfully');
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await serviceService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  permanentDelete = asyncHandler(async (req: Request, res: Response) => {
    await serviceService.permanentDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  restore = asyncHandler(async (req: Request, res: Response) => {
    const service = await serviceService.restore(String(req.params.id), req.user!.id);
    sendSuccess(res, service, 'Service restored successfully');
  });

  publish = asyncHandler(async (req: Request, res: Response) => {
    const service = await serviceService.publish(String(req.params.id), req.user!.id);
    sendSuccess(res, service, 'Service published successfully');
  });

  unpublish = asyncHandler(async (req: Request, res: Response) => {
    const service = await serviceService.unpublish(String(req.params.id), req.user!.id);
    sendSuccess(res, service, 'Service unpublished successfully');
  });

  schedule = asyncHandler(async (req: Request, res: Response) => {
    const service = await serviceService.schedule(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, service, 'Service scheduled successfully');
  });

  archive = asyncHandler(async (req: Request, res: Response) => {
    const service = await serviceService.archive(String(req.params.id), req.user!.id);
    sendSuccess(res, service, 'Service archived successfully');
  });

  duplicate = asyncHandler(async (req: Request, res: Response) => {
    const service = await serviceService.duplicate(String(req.params.id), req.user!.id);
    sendCreated(res, service, 'Service duplicated successfully');
  });

  bulkAction = asyncHandler(async (req: Request, res: Response) => {
    const result = await serviceService.bulkAction(req.body, req.user!.id);
    sendSuccess(res, result, 'Bulk action completed');
  });
}

export const serviceController = new ServiceController();
