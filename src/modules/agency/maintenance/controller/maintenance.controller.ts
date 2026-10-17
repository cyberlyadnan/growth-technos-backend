import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { agreementService, type MaintenanceActor } from '../service/agreement.service';
import { supportService } from '../service/support.service';

function actorFromRequest(req: Request): MaintenanceActor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    fullName: req.user!.email,
  };
}

export const maintenanceController = {
  listAgreements: asyncHandler(async (req: Request, res: Response) => {
    const result = await agreementService.list(req.query);
    sendPaginated(res, result.items, result.meta);
  }),

  getAgreement: asyncHandler(async (req: Request, res: Response) => {
    const item = await agreementService.getById(String(req.params.id));
    sendSuccess(res, item);
  }),

  createAgreement: asyncHandler(async (req: Request, res: Response) => {
    const item = await agreementService.create(req.body, actorFromRequest(req));
    sendCreated(res, item, 'Maintenance agreement created');
  }),

  updateAgreement: asyncHandler(async (req: Request, res: Response) => {
    const item = await agreementService.update(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Agreement updated');
  }),

  activateAgreement: asyncHandler(async (req: Request, res: Response) => {
    const item = await agreementService.activate(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Agreement activated');
  }),

  terminateAgreement: asyncHandler(async (req: Request, res: Response) => {
    const item = await agreementService.terminate(
      String(req.params.id),
      req.body.reason,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Agreement terminated');
  }),

  listSchedules: asyncHandler(async (req: Request, res: Response) => {
    const items = await agreementService.listSchedules(String(req.params.id));
    sendSuccess(res, { schedules: items });
  }),

  generateDraft: asyncHandler(async (req: Request, res: Response) => {
    const result = await agreementService.generateDraftInvoice(
      String(req.params.id),
      actorFromRequest(req),
      req.body.at ? new Date(req.body.at) : new Date(),
    );
    sendCreated(res, result, 'Draft invoice created — not issued or charged');
  }),

  renewalAlerts: asyncHandler(async (req: Request, res: Response) => {
    const withinDays = req.query.withinDays ? Number(req.query.withinDays) : 30;
    const items = await agreementService.renewalAlerts(withinDays);
    sendSuccess(res, { alerts: items, withinDays });
  }),

  listSupport: asyncHandler(async (req: Request, res: Response) => {
    const result = await supportService.list(req.query);
    sendPaginated(res, result.items, result.meta);
  }),

  getSupport: asyncHandler(async (req: Request, res: Response) => {
    const item = await supportService.getById(String(req.params.id));
    sendSuccess(res, item);
  }),

  createSupport: asyncHandler(async (req: Request, res: Response) => {
    const item = await supportService.create(req.body, actorFromRequest(req));
    sendCreated(res, item, 'Support ticket created');
  }),

  updateSupport: asyncHandler(async (req: Request, res: Response) => {
    const item = await supportService.update(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Support ticket updated');
  }),

  addWorkLog: asyncHandler(async (req: Request, res: Response) => {
    const item = await supportService.addWorkLog(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Work log added');
  }),
};
