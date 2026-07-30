import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { faqService } from '../service/faq.service';

export const faqController = {
  listPublic: asyncHandler(async (req: Request, res: Response) => {
    const result = await faqService.listPublic(req.query);
    sendPaginated(res, result.items, result.meta);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await faqService.list(req.query);
    sendPaginated(res, result.items, result.meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const item = await faqService.getById(String(req.params.id));
    sendSuccess(res, item);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const item = await faqService.create(req.body, req.user!.id);
    sendCreated(res, item, 'FAQ created successfully');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const item = await faqService.update(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, item, 'FAQ updated successfully');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await faqService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  }),

  restore: asyncHandler(async (req: Request, res: Response) => {
    const item = await faqService.restore(String(req.params.id), req.user!.id);
    sendSuccess(res, item, 'FAQ restored successfully');
  }),

  permanentDelete: asyncHandler(async (req: Request, res: Response) => {
    await faqService.permanentDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  }),
};
