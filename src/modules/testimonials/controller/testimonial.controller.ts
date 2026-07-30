import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { testimonialService } from '../service/testimonial.service';

export const testimonialController = {
  listPublic: asyncHandler(async (req: Request, res: Response) => {
    const result = await testimonialService.listPublic(req.query);
    sendPaginated(res, result.items, result.meta);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await testimonialService.list(req.query);
    sendPaginated(res, result.items, result.meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const item = await testimonialService.getById(String(req.params.id));
    sendSuccess(res, item);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const item = await testimonialService.create(req.body, req.user!.id);
    sendCreated(res, item, 'Testimonial created successfully');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const item = await testimonialService.update(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, item, 'Testimonial updated successfully');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await testimonialService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  }),

  restore: asyncHandler(async (req: Request, res: Response) => {
    const item = await testimonialService.restore(String(req.params.id), req.user!.id);
    sendSuccess(res, item, 'Testimonial restored successfully');
  }),

  permanentDelete: asyncHandler(async (req: Request, res: Response) => {
    await testimonialService.permanentDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  }),
};
