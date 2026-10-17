import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { expenseService, type ExpenseActor } from '../service/expense.service';

function actorFromRequest(req: Request): ExpenseActor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    fullName: req.user!.email,
  };
}

export const expenseController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await expenseService.list(req.query, actorFromRequest(req));
    sendPaginated(res, result.items, result.meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const item = await expenseService.getById(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const item = await expenseService.create(req.body, actorFromRequest(req));
    sendCreated(res, item, 'Expense created');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const item = await expenseService.update(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Expense updated');
  }),

  record: asyncHandler(async (req: Request, res: Response) => {
    const item = await expenseService.record(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Expense recorded');
  }),

  finalize: asyncHandler(async (req: Request, res: Response) => {
    const item = await expenseService.finalize(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Expense finalized');
  }),

  void: asyncHandler(async (req: Request, res: Response) => {
    const item = await expenseService.void(
      String(req.params.id),
      req.body.reason,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Expense voided');
  }),

  addNote: asyncHandler(async (req: Request, res: Response) => {
    const item = await expenseService.addNote(
      String(req.params.id),
      req.body.note,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Note added');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await expenseService.softDelete(String(req.params.id), actorFromRequest(req));
    sendNoContent(res);
  }),

  restore: asyncHandler(async (req: Request, res: Response) => {
    const item = await expenseService.restore(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Expense restored');
  }),
};
