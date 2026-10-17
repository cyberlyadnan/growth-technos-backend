import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { quotationService, type QuotationActor } from '../service/quotation.service';

function actorFromRequest(req: Request): QuotationActor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    fullName: req.user!.email,
  };
}

export const quotationController = {
  previewTotals: asyncHandler(async (req: Request, res: Response) => {
    const totals = quotationService.previewTotals(req.body);
    sendSuccess(res, totals, 'Totals calculated');
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await quotationService.list(req.query, actorFromRequest(req));
    sendPaginated(res, result.items, result.meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const item = await quotationService.getById(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const item = await quotationService.create(req.body, actorFromRequest(req));
    sendCreated(res, item, 'Quotation created successfully');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const item = await quotationService.update(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Quotation updated successfully');
  }),

  issue: asyncHandler(async (req: Request, res: Response) => {
    const item = await quotationService.issue(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Quotation issued successfully');
  }),

  accept: asyncHandler(async (req: Request, res: Response) => {
    const item = await quotationService.accept(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Quotation accepted successfully');
  }),

  reject: asyncHandler(async (req: Request, res: Response) => {
    const item = await quotationService.reject(
      String(req.params.id),
      req.body.reason,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Quotation rejected successfully');
  }),

  revise: asyncHandler(async (req: Request, res: Response) => {
    const item = await quotationService.revise(
      String(req.params.id),
      req.body.note,
      actorFromRequest(req),
    );
    sendCreated(res, item, 'Quotation revision created successfully');
  }),

  convertToProject: asyncHandler(async (req: Request, res: Response) => {
    const result = await quotationService.convertToProject(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, result, 'Quotation linked to project');
  }),

  markInvoiceReady: asyncHandler(async (req: Request, res: Response) => {
    const item = await quotationService.markInvoiceReady(
      String(req.params.id),
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Quotation marked invoice-ready');
  }),

  addNote: asyncHandler(async (req: Request, res: Response) => {
    const item = await quotationService.addNote(
      String(req.params.id),
      req.body.note,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Note added');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await quotationService.softDelete(String(req.params.id), actorFromRequest(req));
    sendNoContent(res);
  }),

  restore: asyncHandler(async (req: Request, res: Response) => {
    const item = await quotationService.restore(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Quotation restored');
  }),

  downloadPdf: asyncHandler(async (req: Request, res: Response) => {
    const file = await quotationService.generatePdf(
      String(req.params.id),
      actorFromRequest(req),
    );
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  }),

  listCatalog: asyncHandler(async (req: Request, res: Response) => {
    const result = await quotationService.listCatalog(req.query);
    sendPaginated(res, result.items, result.meta);
  }),

  createCatalogItem: asyncHandler(async (req: Request, res: Response) => {
    const item = await quotationService.createCatalogItem(req.body, actorFromRequest(req));
    sendCreated(res, item, 'Catalog item created');
  }),

  updateCatalogItem: asyncHandler(async (req: Request, res: Response) => {
    const item = await quotationService.updateCatalogItem(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Catalog item updated');
  }),

  listTemplates: asyncHandler(async (req: Request, res: Response) => {
    const result = await quotationService.listTemplates(req.query);
    sendPaginated(res, result.items, result.meta);
  }),

  getTemplate: asyncHandler(async (req: Request, res: Response) => {
    const item = await quotationService.getTemplate(String(req.params.id));
    sendSuccess(res, item);
  }),

  createTemplate: asyncHandler(async (req: Request, res: Response) => {
    const item = await quotationService.createTemplate(req.body, actorFromRequest(req));
    sendCreated(res, item, 'Template created');
  }),

  updateTemplate: asyncHandler(async (req: Request, res: Response) => {
    const item = await quotationService.updateTemplate(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Template updated');
  }),
};
