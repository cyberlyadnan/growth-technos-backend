import { z } from 'zod';
import { mongoIdParamSchema, mongoIdSchema, paginationQuerySchema } from '@core/validation/common.validation';

const currencySchema = z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED']);
const taxModeSchema = z.enum(['exclusive', 'inclusive', 'none']);
const gstTreatmentSchema = z.enum(['intra_state', 'inter_state', 'none', 'custom']);
const paymentMethodSchema = z.enum([
  'bank_transfer',
  'upi',
  'cash',
  'cheque',
  'card',
  'other',
]);
const paymentStatusSchema = z.enum(['pending', 'confirmed', 'failed', 'reversed', 'refunded']);
const invoiceStatusSchema = z.enum([
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
  'credited',
]);

const taxRateSchema = z.object({
  name: z.string().min(1).max(80).trim(),
  percent: z.coerce.number().min(0).max(100),
});

const taxConfigSchema = z.object({
  mode: taxModeSchema,
  rates: z.array(taxRateSchema).max(10).default([]),
  treatment: gstTreatmentSchema.optional(),
  gstPercent: z.coerce.number().min(0).max(100).optional(),
  placeOfSupplyState: z.string().max(100).trim().optional(),
  supplierState: z.string().max(100).trim().optional(),
});

const indianTaxSettingsSchema = z.object({
  treatment: gstTreatmentSchema,
  gstPercent: z.coerce.number().min(0).max(100).optional(),
  customRates: z.array(taxRateSchema).max(10).optional(),
  mode: taxModeSchema.optional(),
  placeOfSupplyState: z.string().max(100).trim().optional(),
  supplierState: z.string().max(100).trim().optional(),
});

const lineItemInputSchema = z.object({
  key: z.string().max(64).trim().optional(),
  description: z.string().min(1).max(500).trim(),
  quantity: z.coerce.number().positive(),
  unitPriceMinor: z.coerce.number().int().min(0),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  discountMinor: z.coerce.number().int().min(0).optional(),
  serviceId: mongoIdSchema.optional().nullable(),
  catalogItemId: mongoIdSchema.optional().nullable(),
  unit: z.string().max(40).trim().optional(),
});

const invoiceBodySchema = z.object({
  clientId: mongoIdSchema,
  projectId: mongoIdSchema.optional().nullable(),
  quotationId: mongoIdSchema.optional().nullable(),
  title: z.string().min(1).max(240).trim(),
  issueDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).optional(),
  currency: currencySchema.optional(),
  taxConfig: taxConfigSchema.optional(),
  indianTax: indianTaxSettingsSchema.optional(),
  documentDiscountPercent: z.coerce.number().min(0).max(100).optional(),
  documentDiscountMinor: z.coerce.number().int().min(0).optional(),
  lineItems: z.array(lineItemInputSchema).min(1).max(100),
  paymentTerms: z.string().max(5000).trim().optional(),
  notes: z.string().max(5000).trim().optional(),
  internalNotes: z.string().max(5000).trim().optional(),
});

export const createInvoiceSchema = invoiceBodySchema;
export const updateInvoiceSchema = invoiceBodySchema.partial().extend({
  clientId: mongoIdSchema.optional(),
  lineItems: z.array(lineItemInputSchema).min(1).max(100).optional(),
});

export const listInvoicesSchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
  status: invoiceStatusSchema.optional(),
  clientId: mongoIdSchema.optional(),
  projectId: mongoIdSchema.optional(),
  kind: z.enum(['invoice', 'credit_note']).optional(),
  trashOnly: z.coerce.boolean().optional(),
  includeTrash: z.coerce.boolean().optional(),
});

export const invoiceIdParamSchema = mongoIdParamSchema;

export const cancelInvoiceSchema = z.object({
  reason: z.string().min(1).max(2000).trim(),
});

export const createCreditNoteSchema = z.object({
  title: z.string().min(1).max(240).trim().optional(),
  lineItems: z.array(lineItemInputSchema).min(1).max(100).optional(),
  reason: z.string().max(2000).trim().optional(),
  indianTax: indianTaxSettingsSchema.optional(),
  taxConfig: taxConfigSchema.optional(),
});

export const previewInvoiceTotalsSchema = z.object({
  currency: currencySchema.optional(),
  taxConfig: taxConfigSchema.optional(),
  indianTax: indianTaxSettingsSchema.optional(),
  lineItems: z.array(lineItemInputSchema).min(1).max(100),
  documentDiscountPercent: z.coerce.number().min(0).max(100).optional(),
  documentDiscountMinor: z.coerce.number().int().min(0).optional(),
});

export const allocationInputSchema = z.object({
  invoiceId: mongoIdSchema,
  amountMinor: z.coerce.number().int().positive(),
});

export const createPaymentSchema = z.object({
  clientId: mongoIdSchema,
  amountMinor: z.coerce.number().int().positive(),
  currency: currencySchema.optional(),
  method: paymentMethodSchema,
  paymentDate: z.coerce.date().optional(),
  transactionRef: z.string().max(120).trim().optional(),
  notes: z.string().max(5000).trim().optional(),
  internalNotes: z.string().max(5000).trim().optional(),
  idempotencyKey: z.string().min(8).max(120).trim().optional(),
  /** If true, confirm immediately (manual verified receipt). Default false → pending. */
  confirm: z.boolean().optional(),
  allocations: z.array(allocationInputSchema).max(50).optional(),
  attachments: z
    .array(
      z.object({
        fileName: z.string().min(1).max(255).trim(),
        url: z.string().url().max(2000),
        mimeType: z.string().max(120).trim().optional(),
      }),
    )
    .max(20)
    .optional(),
});

export const listPaymentsSchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
  status: paymentStatusSchema.optional(),
  clientId: mongoIdSchema.optional(),
  invoiceId: mongoIdSchema.optional(),
  method: paymentMethodSchema.optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const paymentIdParamSchema = mongoIdParamSchema;

export const allocatePaymentSchema = z.object({
  allocations: z.array(allocationInputSchema).min(1).max(50),
  idempotencyKey: z.string().min(8).max(120).trim().optional(),
});

export const reverseAllocationSchema = z.object({
  allocationKey: z.string().min(1).max(64).trim(),
  reason: z.string().min(1).max(2000).trim(),
});

export const refundPaymentSchema = z.object({
  amountMinor: z.coerce.number().int().positive(),
  reason: z.string().min(1).max(2000).trim(),
  method: paymentMethodSchema.optional(),
  transactionRef: z.string().max(120).trim().optional(),
  idempotencyKey: z.string().min(8).max(120).trim().optional(),
});

export const addBillingNoteSchema = z.object({
  note: z.string().min(1).max(2000).trim(),
});

export const listReceiptsSchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
  clientId: mongoIdSchema.optional(),
  paymentId: mongoIdSchema.optional(),
});

export const receiptIdParamSchema = mongoIdParamSchema;
