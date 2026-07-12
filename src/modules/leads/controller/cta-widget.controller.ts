import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import {
  contactWidgetService,
  floatingCtaService,
  publicWidgetsService,
  stickyCtaService,
  whatsappWidgetService,
} from '../service/cta-widget.service';

function contextFromQuery(query: Request['query']) {
  return {
    industry: query.industry as string | undefined,
    service: query.service as string | undefined,
    pageType: query.pageType as string | undefined,
    pagePath: query.pagePath as string | undefined,
    device: query.device as string | undefined,
  };
}

export class StickyCtaController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await stickyCtaService.list(req.query);
    sendPaginated(res, result.items, result.meta);
  });

  listPublic = asyncHandler(async (req: Request, res: Response) => {
    const items = await stickyCtaService.listPublishedForContext(
      contextFromQuery(req.query),
      Number(req.query.limit) || 3,
    );
    sendSuccess(res, items);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await stickyCtaService.getById(String(req.params.id)));
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    sendCreated(res, await stickyCtaService.create(req.body, req.user!.id), 'Sticky CTA created successfully');
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await stickyCtaService.update(String(req.params.id), req.body, req.user!.id),
      'Sticky CTA updated successfully',
    );
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await stickyCtaService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  restore = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await stickyCtaService.restore(String(req.params.id), req.user!.id),
      'Sticky CTA restored successfully',
    );
  });

  publish = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await stickyCtaService.publish(String(req.params.id), req.user!.id),
      'Sticky CTA published successfully',
    );
  });

  unpublish = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await stickyCtaService.unpublish(String(req.params.id), req.user!.id),
      'Sticky CTA unpublished successfully',
    );
  });
}

export class FloatingCtaController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await floatingCtaService.list(req.query);
    sendPaginated(res, result.items, result.meta);
  });

  listPublic = asyncHandler(async (req: Request, res: Response) => {
    const items = await floatingCtaService.listPublishedForContext(
      contextFromQuery(req.query),
      Number(req.query.limit) || 3,
    );
    sendSuccess(res, items);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await floatingCtaService.getById(String(req.params.id)));
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    sendCreated(
      res,
      await floatingCtaService.create(req.body, req.user!.id),
      'Floating CTA created successfully',
    );
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await floatingCtaService.update(String(req.params.id), req.body, req.user!.id),
      'Floating CTA updated successfully',
    );
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await floatingCtaService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  restore = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await floatingCtaService.restore(String(req.params.id), req.user!.id),
      'Floating CTA restored successfully',
    );
  });

  publish = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await floatingCtaService.publish(String(req.params.id), req.user!.id),
      'Floating CTA published successfully',
    );
  });

  unpublish = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await floatingCtaService.unpublish(String(req.params.id), req.user!.id),
      'Floating CTA unpublished successfully',
    );
  });
}

export class ContactWidgetController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await contactWidgetService.list(req.query);
    sendPaginated(res, result.items, result.meta);
  });

  listPublic = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await contactWidgetService.getPublishedForContext(contextFromQuery(req.query)));
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await contactWidgetService.getById(String(req.params.id)));
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    sendCreated(
      res,
      await contactWidgetService.create(req.body, req.user!.id),
      'Contact widget created successfully',
    );
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await contactWidgetService.update(String(req.params.id), req.body, req.user!.id),
      'Contact widget updated successfully',
    );
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await contactWidgetService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  restore = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await contactWidgetService.restore(String(req.params.id), req.user!.id),
      'Contact widget restored successfully',
    );
  });

  publish = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await contactWidgetService.publish(String(req.params.id), req.user!.id),
      'Contact widget published successfully',
    );
  });

  unpublish = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await contactWidgetService.unpublish(String(req.params.id), req.user!.id),
      'Contact widget unpublished successfully',
    );
  });
}

export class WhatsAppWidgetController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await whatsappWidgetService.list(req.query);
    sendPaginated(res, result.items, result.meta);
  });

  listPublic = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await whatsappWidgetService.getPublishedForContext(contextFromQuery(req.query)));
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await whatsappWidgetService.getById(String(req.params.id)));
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    sendCreated(
      res,
      await whatsappWidgetService.create(req.body, req.user!.id),
      'WhatsApp widget created successfully',
    );
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await whatsappWidgetService.update(String(req.params.id), req.body, req.user!.id),
      'WhatsApp widget updated successfully',
    );
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await whatsappWidgetService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  restore = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await whatsappWidgetService.restore(String(req.params.id), req.user!.id),
      'WhatsApp widget restored successfully',
    );
  });

  publish = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await whatsappWidgetService.publish(String(req.params.id), req.user!.id),
      'WhatsApp widget published successfully',
    );
  });

  unpublish = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await whatsappWidgetService.unpublish(String(req.params.id), req.user!.id),
      'WhatsApp widget unpublished successfully',
    );
  });
}

export class PublicWidgetsController {
  getBundle = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await publicWidgetsService.getBundle(contextFromQuery(req.query)));
  });
}

export const stickyCtaController = new StickyCtaController();
export const floatingCtaController = new FloatingCtaController();
export const contactWidgetController = new ContactWidgetController();
export const whatsappWidgetController = new WhatsAppWidgetController();
export const publicWidgetsController = new PublicWidgetsController();
