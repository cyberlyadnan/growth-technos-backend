import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { invoiceService, type BillingActor } from '../service/invoice.service';
import { paymentService } from '../service/payment.service';

function actorFromRequest(req: Request): BillingActor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    fullName: req.user!.email,
  };
}

export const billingController = {
  // —— Invoices ——
  previewInvoiceTotals: asyncHandler(async (req: Request, res: Response) => {
    const totals = invoiceService.previewTotals(req.body);
    sendSuccess(res, totals, 'Totals calculated');
  }),

  listInvoices: asyncHandler(async (req: Request, res: Response) => {
    const result = await invoiceService.list(req.query, actorFromRequest(req));
    sendPaginated(res, result.items, result.meta);
  }),

  getInvoice: asyncHandler(async (req: Request, res: Response) => {
    const item = await invoiceService.getById(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item);
  }),

  createInvoice: asyncHandler(async (req: Request, res: Response) => {
    const item = await invoiceService.create(req.body, actorFromRequest(req));
    sendCreated(res, item, 'Invoice created successfully');
  }),

  updateInvoice: asyncHandler(async (req: Request, res: Response) => {
    const item = await invoiceService.update(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Invoice updated successfully');
  }),

  issueInvoice: asyncHandler(async (req: Request, res: Response) => {
    const item = await invoiceService.issue(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Invoice issued successfully');
  }),

  cancelInvoice: asyncHandler(async (req: Request, res: Response) => {
    const item = await invoiceService.cancel(
      String(req.params.id),
      req.body.reason,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Invoice cancelled');
  }),

  createCreditNote: asyncHandler(async (req: Request, res: Response) => {
    const item = await invoiceService.createCreditNote(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendCreated(res, item, 'Credit note created');
  }),

  addInvoiceNote: asyncHandler(async (req: Request, res: Response) => {
    const item = await invoiceService.addNote(
      String(req.params.id),
      req.body.note,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Note added');
  }),

  removeInvoice: asyncHandler(async (req: Request, res: Response) => {
    await invoiceService.softDelete(String(req.params.id), actorFromRequest(req));
    sendNoContent(res);
  }),

  restoreInvoice: asyncHandler(async (req: Request, res: Response) => {
    const item = await invoiceService.restore(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Invoice restored');
  }),

  downloadInvoicePdf: asyncHandler(async (req: Request, res: Response) => {
    const file = await invoiceService.generatePdf(String(req.params.id), actorFromRequest(req));
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  }),

  // —— Payments ——
  listPayments: asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentService.list(req.query, actorFromRequest(req));
    sendPaginated(res, result.items, result.meta);
  }),

  getPayment: asyncHandler(async (req: Request, res: Response) => {
    const item = await paymentService.getById(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item);
  }),

  createPayment: asyncHandler(async (req: Request, res: Response) => {
    const item = await paymentService.create(req.body, actorFromRequest(req));
    sendCreated(res, item, 'Payment recorded');
  }),

  confirmPayment: asyncHandler(async (req: Request, res: Response) => {
    const item = await paymentService.confirm(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item, 'Payment confirmed');
  }),

  failPayment: asyncHandler(async (req: Request, res: Response) => {
    const item = await paymentService.markFailed(
      String(req.params.id),
      req.body.reason ?? 'Marked failed',
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Payment marked failed');
  }),

  allocatePayment: asyncHandler(async (req: Request, res: Response) => {
    const item = await paymentService.allocate(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Payment allocated');
  }),

  reverseAllocation: asyncHandler(async (req: Request, res: Response) => {
    const item = await paymentService.reverseAllocation(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Allocation reversed');
  }),

  refundPayment: asyncHandler(async (req: Request, res: Response) => {
    const item = await paymentService.refund(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    sendCreated(res, item, 'Refund recorded');
  }),

  addPaymentNote: asyncHandler(async (req: Request, res: Response) => {
    const item = await paymentService.addNote(
      String(req.params.id),
      req.body.note,
      actorFromRequest(req),
    );
    sendSuccess(res, item, 'Note added');
  }),

  getPaymentReceipt: asyncHandler(async (req: Request, res: Response) => {
    const item = await paymentService.getReceipt(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item);
  }),

  // —— Receipts ——
  listReceipts: asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentService.listReceipts(req.query, actorFromRequest(req));
    sendPaginated(res, result.items, result.meta);
  }),

  getReceipt: asyncHandler(async (req: Request, res: Response) => {
    const item = await paymentService.getReceiptById(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item);
  }),

  downloadReceiptPdf: asyncHandler(async (req: Request, res: Response) => {
    const file = await paymentService.generateReceiptPdf(
      String(req.params.id),
      actorFromRequest(req),
    );
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  }),
};
