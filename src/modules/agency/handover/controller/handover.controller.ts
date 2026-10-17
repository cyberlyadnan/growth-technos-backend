import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { handoverService, type HandoverActor } from '../service/handover.service';

function actorFromRequest(req: Request): HandoverActor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    email: req.user!.email,
    fullName: req.user!.email,
  };
}

export const handoverController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await handoverService.list(req.query);
    sendPaginated(res, result.items, result.meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const item = await handoverService.getById(String(req.params.id));
    sendSuccess(res, item);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const item = await handoverService.create(req.body, actorFromRequest(req));
    sendCreated(res, item, 'Handover created');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const item = await handoverService.updateMeta(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Handover updated');
  }),

  updateChecklistItem: asyncHandler(async (req: Request, res: Response) => {
    const item = await handoverService.updateChecklistItem(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Checklist item updated');
  }),

  complete: asyncHandler(async (req: Request, res: Response) => {
    const item = await handoverService.complete(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Handover completed');
  }),

  pdf: asyncHandler(async (req: Request, res: Response) => {
    const buffer = await handoverService.buildPdf(String(req.params.id));
    const handover = await handoverService.getById(String(req.params.id));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${handover.code}-handover.pdf"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  }),
};
