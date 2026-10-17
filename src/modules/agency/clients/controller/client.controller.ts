import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { clientService, type ClientActor } from '../service/client.service';

function actorFromRequest(req: Request): ClientActor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    fullName: req.user!.email,
  };
}

export const clientController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await clientService.list(req.query, actorFromRequest(req));
    sendPaginated(res, result.items, result.meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const item = await clientService.getById(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const item = await clientService.create(req.body, actorFromRequest(req));
    sendCreated(res, item, 'Client created successfully');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const item = await clientService.update(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Client updated successfully');
  }),

  archive: asyncHandler(async (req: Request, res: Response) => {
    const item = await clientService.archive(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Client archived successfully');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await clientService.softDelete(String(req.params.id), actorFromRequest(req));
    sendNoContent(res);
  }),

  restore: asyncHandler(async (req: Request, res: Response) => {
    const item = await clientService.restore(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Client restored successfully');
  }),

  addNote: asyncHandler(async (req: Request, res: Response) => {
    const item = await clientService.addNote(
      String(req.params.id),
      req.body.note,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Note added successfully');
  }),

  convertFromLead: asyncHandler(async (req: Request, res: Response) => {
    const leadId = String(req.params.leadId ?? req.params.id);
    const item = await clientService.convertFromLead(leadId, req.body, actorFromRequest(req));
    sendCreated(res, item, 'Lead converted to client successfully');
  }),
};
