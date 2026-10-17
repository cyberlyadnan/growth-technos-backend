import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { renewalService, type RenewalActor } from '../service/renewal.service';

function actorFromRequest(req: Request): RenewalActor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    fullName: req.user!.email,
  };
}

export const renewalController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await renewalService.list(req.query);
    sendPaginated(res, result.items, result.meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const item = await renewalService.getById(String(req.params.id));
    sendSuccess(res, item);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const item = await renewalService.create(req.body, actorFromRequest(req));
    sendCreated(res, item, 'Renewal created');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const item = await renewalService.update(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Renewal updated');
  }),

  complete: asyncHandler(async (req: Request, res: Response) => {
    const item = await renewalService.complete(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Renewal completed');
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const item = await renewalService.cancel(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Renewal cancelled');
  }),

  processDue: asyncHandler(async (_req: Request, res: Response) => {
    const result = await renewalService.processDueReminders();
    sendSuccess(res, result, 'Due renewals processed');
  }),
};
