import { Router } from 'express';
import { Permission } from '@core/constants';
import { authorize, validate } from '@core/middlewares';
import { billingController } from '../controller/billing.controller';
import {
  addBillingNoteSchema,
  allocatePaymentSchema,
  cancelInvoiceSchema,
  createCreditNoteSchema,
  createInvoiceSchema,
  createPaymentSchema,
  invoiceIdParamSchema,
  listInvoicesSchema,
  listPaymentsSchema,
  listReceiptsSchema,
  paymentIdParamSchema,
  previewInvoiceTotalsSchema,
  receiptIdParamSchema,
  refundPaymentSchema,
  reverseAllocationSchema,
  updateInvoiceSchema,
} from '../validation/billing.validation';

const router = Router();

// —— Invoices ——
const invoices = Router();

invoices.post(
  '/preview-totals',
  authorize(Permission.INVOICES_READ),
  validate(previewInvoiceTotalsSchema),
  billingController.previewInvoiceTotals,
);

invoices.get(
  '/',
  authorize(Permission.INVOICES_READ),
  validate(listInvoicesSchema, 'query'),
  billingController.listInvoices,
);
invoices.post(
  '/',
  authorize(Permission.INVOICES_CREATE),
  validate(createInvoiceSchema),
  billingController.createInvoice,
);

invoices.get(
  '/:id',
  authorize(Permission.INVOICES_READ),
  validate(invoiceIdParamSchema, 'params'),
  billingController.getInvoice,
);
invoices.patch(
  '/:id',
  authorize(Permission.INVOICES_UPDATE),
  validate(invoiceIdParamSchema, 'params'),
  validate(updateInvoiceSchema),
  billingController.updateInvoice,
);
invoices.post(
  '/:id/issue',
  authorize(Permission.INVOICES_UPDATE),
  validate(invoiceIdParamSchema, 'params'),
  billingController.issueInvoice,
);
invoices.post(
  '/:id/cancel',
  authorize(Permission.INVOICES_UPDATE),
  validate(invoiceIdParamSchema, 'params'),
  validate(cancelInvoiceSchema),
  billingController.cancelInvoice,
);
invoices.post(
  '/:id/credit-notes',
  authorize(Permission.INVOICES_CREATE),
  validate(invoiceIdParamSchema, 'params'),
  validate(createCreditNoteSchema),
  billingController.createCreditNote,
);
invoices.post(
  '/:id/notes',
  authorize(Permission.INVOICES_UPDATE),
  validate(invoiceIdParamSchema, 'params'),
  validate(addBillingNoteSchema),
  billingController.addInvoiceNote,
);
invoices.get(
  '/:id/pdf',
  authorize(Permission.INVOICES_READ),
  validate(invoiceIdParamSchema, 'params'),
  billingController.downloadInvoicePdf,
);
invoices.post(
  '/:id/restore',
  authorize(Permission.INVOICES_UPDATE),
  validate(invoiceIdParamSchema, 'params'),
  billingController.restoreInvoice,
);
invoices.delete(
  '/:id',
  authorize(Permission.INVOICES_DELETE),
  validate(invoiceIdParamSchema, 'params'),
  billingController.removeInvoice,
);

// —— Payments ——
const payments = Router();

payments.get(
  '/',
  authorize(Permission.PAYMENTS_READ),
  validate(listPaymentsSchema, 'query'),
  billingController.listPayments,
);
payments.post(
  '/',
  authorize(Permission.PAYMENTS_CREATE),
  validate(createPaymentSchema),
  billingController.createPayment,
);
payments.get(
  '/:id',
  authorize(Permission.PAYMENTS_READ),
  validate(paymentIdParamSchema, 'params'),
  billingController.getPayment,
);
payments.post(
  '/:id/confirm',
  authorize(Permission.PAYMENTS_UPDATE),
  validate(paymentIdParamSchema, 'params'),
  billingController.confirmPayment,
);
payments.post(
  '/:id/fail',
  authorize(Permission.PAYMENTS_UPDATE),
  validate(paymentIdParamSchema, 'params'),
  validate(cancelInvoiceSchema),
  billingController.failPayment,
);
payments.post(
  '/:id/allocate',
  authorize(Permission.PAYMENTS_UPDATE),
  validate(paymentIdParamSchema, 'params'),
  validate(allocatePaymentSchema),
  billingController.allocatePayment,
);
payments.post(
  '/:id/reverse-allocation',
  authorize(Permission.PAYMENTS_UPDATE),
  validate(paymentIdParamSchema, 'params'),
  validate(reverseAllocationSchema),
  billingController.reverseAllocation,
);
payments.post(
  '/:id/refund',
  authorize(Permission.PAYMENTS_CREATE),
  validate(paymentIdParamSchema, 'params'),
  validate(refundPaymentSchema),
  billingController.refundPayment,
);
payments.post(
  '/:id/notes',
  authorize(Permission.PAYMENTS_UPDATE),
  validate(paymentIdParamSchema, 'params'),
  validate(addBillingNoteSchema),
  billingController.addPaymentNote,
);
payments.get(
  '/:id/receipt',
  authorize(Permission.PAYMENTS_READ),
  validate(paymentIdParamSchema, 'params'),
  billingController.getPaymentReceipt,
);

// —— Receipts ——
const receipts = Router();

receipts.get(
  '/',
  authorize(Permission.PAYMENTS_READ),
  validate(listReceiptsSchema, 'query'),
  billingController.listReceipts,
);
receipts.get(
  '/:id',
  authorize(Permission.PAYMENTS_READ),
  validate(receiptIdParamSchema, 'params'),
  billingController.getReceipt,
);
receipts.get(
  '/:id/pdf',
  authorize(Permission.PAYMENTS_READ),
  validate(receiptIdParamSchema, 'params'),
  billingController.downloadReceiptPdf,
);

router.use('/invoices', invoices);
router.use('/payments', payments);
router.use('/receipts', receipts);

export default router;
