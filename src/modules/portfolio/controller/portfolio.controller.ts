import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { portfolioService } from '../service/portfolio.service';

export class PortfolioController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await portfolioService.list(req.query);
    sendPaginated(res, result.projects, result.meta);
  });

  listPublished = asyncHandler(async (req: Request, res: Response) => {
    const result = await portfolioService.listPublished(req.query);
    sendPaginated(res, result.projects, result.meta);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const project = await portfolioService.getById(String(req.params.id));
    sendSuccess(res, project);
  });

  getPublishedBySlug = asyncHandler(async (req: Request, res: Response) => {
    const project = await portfolioService.getPublishedBySlug(String(req.params.slug));
    sendSuccess(res, project);
  });

  getPublicFeeds = asyncHandler(async (_req: Request, res: Response) => {
    const feeds = await portfolioService.getPublicFeeds();
    sendSuccess(res, feeds);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const project = await portfolioService.create(req.body, req.user!.id);
    sendCreated(res, project, 'Portfolio project created successfully');
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const project = await portfolioService.update(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, project, 'Portfolio project updated successfully');
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await portfolioService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  permanentDelete = asyncHandler(async (req: Request, res: Response) => {
    await portfolioService.permanentDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  restore = asyncHandler(async (req: Request, res: Response) => {
    const project = await portfolioService.restore(String(req.params.id), req.user!.id);
    sendSuccess(res, project, 'Portfolio project restored successfully');
  });

  publish = asyncHandler(async (req: Request, res: Response) => {
    const project = await portfolioService.publish(String(req.params.id), req.user!.id);
    sendSuccess(res, project, 'Portfolio project published successfully');
  });

  unpublish = asyncHandler(async (req: Request, res: Response) => {
    const project = await portfolioService.unpublish(String(req.params.id), req.user!.id);
    sendSuccess(res, project, 'Portfolio project unpublished successfully');
  });

  schedule = asyncHandler(async (req: Request, res: Response) => {
    const project = await portfolioService.schedule(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, project, 'Portfolio project scheduled successfully');
  });

  archive = asyncHandler(async (req: Request, res: Response) => {
    const project = await portfolioService.archive(String(req.params.id), req.user!.id);
    sendSuccess(res, project, 'Portfolio project archived successfully');
  });

  duplicate = asyncHandler(async (req: Request, res: Response) => {
    const project = await portfolioService.duplicate(String(req.params.id), req.user!.id);
    sendCreated(res, project, 'Portfolio project duplicated successfully');
  });

  bulkAction = asyncHandler(async (req: Request, res: Response) => {
    const result = await portfolioService.bulkAction(req.body, req.user!.id);
    sendSuccess(res, result, 'Bulk action completed');
  });
}

export const portfolioController = new PortfolioController();
