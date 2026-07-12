import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { PopupTrigger } from '@core/constants/leads';
import { popupService } from '../service/popup.service';

export class PopupController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await popupService.list(req.query);
    sendPaginated(res, result.popups, result.meta);
  });

  listPublic = asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 3;
    const popups = await popupService.listPublishedForContext(
      {
        industry: req.query.industry as string | undefined,
        service: req.query.service as string | undefined,
        pageType: req.query.pageType as string | undefined,
        pagePath: req.query.pagePath as string | undefined,
        device: req.query.device as string | undefined,
        trigger: req.query.trigger as PopupTrigger | undefined,
      },
      limit,
    );
    sendSuccess(res, popups);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const popup = await popupService.getById(String(req.params.id));
    sendSuccess(res, popup);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const popup = await popupService.create(req.body, req.user!.id);
    sendCreated(res, popup, 'Popup campaign created successfully');
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const popup = await popupService.update(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, popup, 'Popup campaign updated successfully');
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await popupService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  restore = asyncHandler(async (req: Request, res: Response) => {
    const popup = await popupService.restore(String(req.params.id), req.user!.id);
    sendSuccess(res, popup, 'Popup campaign restored successfully');
  });

  publish = asyncHandler(async (req: Request, res: Response) => {
    const popup = await popupService.publish(String(req.params.id), req.user!.id);
    sendSuccess(res, popup, 'Popup campaign published successfully');
  });

  unpublish = asyncHandler(async (req: Request, res: Response) => {
    const popup = await popupService.unpublish(String(req.params.id), req.user!.id);
    sendSuccess(res, popup, 'Popup campaign unpublished successfully');
  });
}

export const popupController = new PopupController();
