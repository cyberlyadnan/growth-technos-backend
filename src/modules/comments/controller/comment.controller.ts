import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { commentService } from '../service/comment.service';

export class CommentController {
  listForBlog = asyncHandler(async (req: Request, res: Response) => {
    const comments = await commentService.listForBlog(
      String(req.params.id),
      req.user?.id,
    );
    sendSuccess(res, comments);
  });

  createForBlog = asyncHandler(async (req: Request, res: Response) => {
    const comment = await commentService.createForBlog(
      String(req.params.id),
      req.body,
      req.user
        ? {
            id: req.user.id,
            role: req.user.role,
            permissions: req.user.permissions,
          }
        : undefined,
    );
    sendCreated(res, comment, 'Comment submitted successfully');
  });

  listAdmin = asyncHandler(async (req: Request, res: Response) => {
    const result = await commentService.listAdmin(req.query);
    sendPaginated(res, result.comments, result.meta);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const comment = await commentService.update(String(req.params.id), req.body, req.user
      ? {
          id: req.user.id,
          permissions: req.user.permissions,
        }
      : undefined);
    sendSuccess(res, comment, 'Comment updated successfully');
  });

  like = asyncHandler(async (req: Request, res: Response) => {
    const result = await commentService.like(
      String(req.params.id),
      req.user ? { id: req.user.id } : undefined,
    );
    sendSuccess(res, result, 'Comment liked');
  });

  report = asyncHandler(async (req: Request, res: Response) => {
    const result = await commentService.report(
      String(req.params.id),
      req.body,
      req.ip,
    );
    sendSuccess(res, result, 'Comment reported');
  });

  moderate = asyncHandler(async (req: Request, res: Response) => {
    const comment = await commentService.moderate(
      String(req.params.id),
      req.body,
      req.user!.id,
    );
    sendSuccess(res, comment, 'Comment moderated successfully');
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await commentService.remove(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });
}

export const commentController = new CommentController();
