import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { thankYouPageService, successMessageService } from '../service/thank-you.service';

export class ThankYouPageController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await thankYouPageService.list(req.query);
    sendPaginated(res, result.pages, result.meta);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await thankYouPageService.getById(String(req.params.id)));
  });

  getPublicBySlug = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await thankYouPageService.getPublishedBySlug(String(req.params.slug)));
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    sendCreated(
      res,
      await thankYouPageService.create(req.body, req.user!.id),
      'Thank you page created successfully',
    );
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await thankYouPageService.update(String(req.params.id), req.body, req.user!.id),
      'Thank you page updated successfully',
    );
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await thankYouPageService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  restore = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await thankYouPageService.restore(String(req.params.id), req.user!.id),
      'Thank you page restored successfully',
    );
  });

  publish = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await thankYouPageService.publish(String(req.params.id), req.user!.id),
      'Thank you page published successfully',
    );
  });

  unpublish = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await thankYouPageService.unpublish(String(req.params.id), req.user!.id),
      'Thank you page unpublished successfully',
    );
  });
}

export class SuccessMessageController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await successMessageService.list(req.query);
    sendPaginated(res, result.messages, result.meta);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await successMessageService.getById(String(req.params.id)));
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    sendCreated(
      res,
      await successMessageService.create(req.body, req.user!.id),
      'Success message created successfully',
    );
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await successMessageService.update(String(req.params.id), req.body, req.user!.id),
      'Success message updated successfully',
    );
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await successMessageService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  restore = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await successMessageService.restore(String(req.params.id), req.user!.id),
      'Success message restored successfully',
    );
  });

  publish = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await successMessageService.publish(String(req.params.id), req.user!.id),
      'Success message published successfully',
    );
  });

  unpublish = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await successMessageService.unpublish(String(req.params.id), req.user!.id),
      'Success message unpublished successfully',
    );
  });
}

export const thankYouPageController = new ThankYouPageController();
export const successMessageController = new SuccessMessageController();
