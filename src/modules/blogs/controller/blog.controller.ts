import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { blogService } from '../service/blog.service';

export class BlogController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await blogService.list(req.query);
    sendPaginated(res, result.blogs, result.meta);
  });

  listPublished = asyncHandler(async (req: Request, res: Response) => {
    const result = await blogService.listPublished(req.query);
    sendPaginated(res, result.blogs, result.meta);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const blog = await blogService.getById(String(req.params.id));
    sendSuccess(res, blog);
  });

  getPublishedBySlug = asyncHandler(async (req: Request, res: Response) => {
    const blog = await blogService.getPublishedBySlug(String(req.params.slug));
    sendSuccess(res, blog);
  });

  getPublicFeeds = asyncHandler(async (_req: Request, res: Response) => {
    const feeds = await blogService.getPublicFeeds();
    sendSuccess(res, feeds);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const blog = await blogService.create(req.body, req.user!.id);
    sendCreated(res, blog, 'Blog created successfully');
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const blog = await blogService.update(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, blog, 'Blog updated successfully');
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await blogService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  permanentDelete = asyncHandler(async (req: Request, res: Response) => {
    await blogService.permanentDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  restore = asyncHandler(async (req: Request, res: Response) => {
    const blog = await blogService.restore(String(req.params.id), req.user!.id);
    sendSuccess(res, blog, 'Blog restored successfully');
  });

  publish = asyncHandler(async (req: Request, res: Response) => {
    const blog = await blogService.publish(String(req.params.id), req.user!.id);
    sendSuccess(res, blog, 'Blog published successfully');
  });

  unpublish = asyncHandler(async (req: Request, res: Response) => {
    const blog = await blogService.unpublish(String(req.params.id), req.user!.id);
    sendSuccess(res, blog, 'Blog unpublished successfully');
  });

  schedule = asyncHandler(async (req: Request, res: Response) => {
    const blog = await blogService.schedule(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, blog, 'Blog scheduled successfully');
  });

  archive = asyncHandler(async (req: Request, res: Response) => {
    const blog = await blogService.archive(String(req.params.id), req.user!.id);
    sendSuccess(res, blog, 'Blog archived successfully');
  });

  duplicate = asyncHandler(async (req: Request, res: Response) => {
    const blog = await blogService.duplicate(String(req.params.id), req.user!.id);
    sendCreated(res, blog, 'Blog duplicated successfully');
  });

  autosave = asyncHandler(async (req: Request, res: Response) => {
    const result = await blogService.autosave(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, result, 'Draft autosaved');
  });

  bulkAction = asyncHandler(async (req: Request, res: Response) => {
    const result = await blogService.bulkAction(req.body, req.user!.id);
    sendSuccess(res, result, 'Bulk action completed');
  });
}

export const blogController = new BlogController();
