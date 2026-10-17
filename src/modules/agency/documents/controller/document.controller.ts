import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { BadRequestError } from '@core/errors';
import { documentService, type DocumentActor } from '../service/document.service';
import { activityService } from '@modules/agency/activity/service/activity.service';

function actorFromRequest(req: Request): DocumentActor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    email: req.user!.email,
    fullName: req.user!.email,
  };
}

export const documentController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await documentService.list(req.query);
    sendPaginated(res, result.items, result.meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const item = await documentService.getById(String(req.params.id));
    sendSuccess(res, item);
  }),

  upload: asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) throw new BadRequestError('file is required');
    const item = await documentService.upload(
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      req.body,
      actorFromRequest(req),
    );
    sendCreated(res, item, 'Document uploaded');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const item = await documentService.updateMeta(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Document updated');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await documentService.remove(String(req.params.id), actorFromRequest(req));
    sendNoContent(res);
  }),

  download: asyncHandler(async (req: Request, res: Response) => {
    await documentService.streamDownload(String(req.params.id), res, actorFromRequest(req));
  }),

  listActivity: asyncHandler(async (req: Request, res: Response) => {
    const result = await activityService.list(req.query);
    sendPaginated(res, result.items, result.meta);
  }),

  getActivity: asyncHandler(async (req: Request, res: Response) => {
    const item = await activityService.getById(String(req.params.id));
    sendSuccess(res, item);
  }),

  /** Explicitly refuse silent modification of historical events */
  mutateActivityForbidden: asyncHandler(async (req: Request, _res: Response) => {
    await activityService.assertNotImmutable(String(req.params.id));
    throw new BadRequestError(
      'Activity history cannot be modified or deleted via this API. Use dedicated entity endpoints to change business records.',
    );
  }),
};
