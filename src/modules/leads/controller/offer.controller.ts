import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { offerService } from '../service/offer.service';
import { leadMagnetService } from '../service/lead-magnet.service';

export class OfferController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await offerService.list(req.query);
    sendPaginated(res, result.offers, result.meta);
  });

  listPublic = asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 5;
    const offers = await offerService.listPublishedForContext(
      {
        industry: req.query.industry as string | undefined,
        service: req.query.service as string | undefined,
        pageType: req.query.pageType as string | undefined,
        pagePath: req.query.pagePath as string | undefined,
        device: req.query.device as string | undefined,
      },
      limit,
    );
    sendSuccess(res, offers);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const offer = await offerService.getById(String(req.params.id));
    sendSuccess(res, offer);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const offer = await offerService.create(req.body, req.user!.id);
    sendCreated(res, offer, 'Offer created successfully');
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const offer = await offerService.update(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, offer, 'Offer updated successfully');
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await offerService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  restore = asyncHandler(async (req: Request, res: Response) => {
    const offer = await offerService.restore(String(req.params.id), req.user!.id);
    sendSuccess(res, offer, 'Offer restored successfully');
  });

  publish = asyncHandler(async (req: Request, res: Response) => {
    const offer = await offerService.publish(String(req.params.id), req.user!.id);
    sendSuccess(res, offer, 'Offer published successfully');
  });

  unpublish = asyncHandler(async (req: Request, res: Response) => {
    const offer = await offerService.unpublish(String(req.params.id), req.user!.id);
    sendSuccess(res, offer, 'Offer unpublished successfully');
  });
}

export class LeadMagnetController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await leadMagnetService.list(req.query);
    sendPaginated(res, result.magnets, result.meta);
  });

  listPublic = asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 5;
    const magnets = await leadMagnetService.listPublishedForContext(
      {
        industry: req.query.industry as string | undefined,
        service: req.query.service as string | undefined,
        pageType: req.query.pageType as string | undefined,
        pagePath: req.query.pagePath as string | undefined,
        device: req.query.device as string | undefined,
      },
      limit,
    );
    sendSuccess(res, magnets);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const magnet = await leadMagnetService.getById(String(req.params.id));
    sendSuccess(res, magnet);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const magnet = await leadMagnetService.create(req.body, req.user!.id);
    sendCreated(res, magnet, 'Lead magnet created successfully');
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const magnet = await leadMagnetService.update(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, magnet, 'Lead magnet updated successfully');
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await leadMagnetService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  restore = asyncHandler(async (req: Request, res: Response) => {
    const magnet = await leadMagnetService.restore(String(req.params.id), req.user!.id);
    sendSuccess(res, magnet, 'Lead magnet restored successfully');
  });

  publish = asyncHandler(async (req: Request, res: Response) => {
    const magnet = await leadMagnetService.publish(String(req.params.id), req.user!.id);
    sendSuccess(res, magnet, 'Lead magnet published successfully');
  });

  unpublish = asyncHandler(async (req: Request, res: Response) => {
    const magnet = await leadMagnetService.unpublish(String(req.params.id), req.user!.id);
    sendSuccess(res, magnet, 'Lead magnet unpublished successfully');
  });
}

export const offerController = new OfferController();
export const leadMagnetController = new LeadMagnetController();
