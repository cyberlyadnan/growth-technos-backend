import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { projectService, type ProjectActor } from '../service/project.service';

function actorFromRequest(req: Request): ProjectActor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    fullName: req.user!.email,
  };
}

export const projectController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await projectService.list(req.query, actorFromRequest(req));
    sendPaginated(res, result.items, result.meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const item = await projectService.getById(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const item = await projectService.create(req.body, actorFromRequest(req));
    sendCreated(res, item, 'Project created successfully');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const item = await projectService.update(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Project updated successfully');
  }),

  transitionStatus: asyncHandler(async (req: Request, res: Response) => {
    const item = await projectService.transitionStatus(
      String(req.params.id),
      req.body.status,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Project status updated successfully');
  }),

  archive: asyncHandler(async (req: Request, res: Response) => {
    const item = await projectService.archive(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Project archived successfully');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await projectService.softDelete(String(req.params.id), actorFromRequest(req));
    sendNoContent(res);
  }),

  restore: asyncHandler(async (req: Request, res: Response) => {
    const item = await projectService.restore(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Project restored successfully');
  }),

  addNote: asyncHandler(async (req: Request, res: Response) => {
    const item = await projectService.addNote(
      String(req.params.id),
      req.body.note,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Note added successfully');
  }),

  approveScope: asyncHandler(async (req: Request, res: Response) => {
    const item = await projectService.approveScope(
      String(req.params.id),
      req.body.note,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Scope approved successfully');
  }),

  createChangeRequest: asyncHandler(async (req: Request, res: Response) => {
    const item = await projectService.createChangeRequest(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendCreated(res, item, 'Change request created successfully');
  }),

  resolveChangeRequest: asyncHandler(async (req: Request, res: Response) => {
    const item = await projectService.resolveChangeRequest(
      String(req.params.id),
      String(req.params.key),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Change request resolved successfully');
  }),

  addAcceptance: asyncHandler(async (req: Request, res: Response) => {
    const item = await projectService.addAcceptance(
      String(req.params.id),
      req.body.notes,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Acceptance recorded successfully');
  }),
};
