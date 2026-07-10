import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { authorService } from '../service/author.service';

export const authorController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await authorService.list(req.query);
    sendPaginated(res, result.items, result.meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const item = await authorService.getById(String(req.params.id));
    sendSuccess(res, item);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const item = await authorService.create(req.body, req.user!.id);
    sendCreated(res, item, 'Author created successfully');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const item = await authorService.update(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, item, 'Author updated successfully');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await authorService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  }),

  restore: asyncHandler(async (req: Request, res: Response) => {
    const item = await authorService.restore(String(req.params.id), req.user!.id);
    sendSuccess(res, item, 'Author restored successfully');
  }),

  permanentDelete: asyncHandler(async (req: Request, res: Response) => {
    await authorService.permanentDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  }),
};
