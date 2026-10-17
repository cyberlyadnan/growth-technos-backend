import { z } from 'zod';
import { mongoIdParamSchema, mongoIdSchema, paginationQuerySchema } from '@core/validation/common.validation';

const currencySchema = z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED']);
const categorySchema = z.enum([
  'hosting',
  'domains',
  'software_subscriptions',
  'contractors',
  'development',
  'advertising',
  'operating',
  'other',
]);
const statusSchema = z.enum(['draft', 'recorded', 'finalized', 'void']);
const paymentStatusSchema = z.enum(['unpaid', 'paid', 'partially_paid', 'reimbursed']);
const recurringIntervalSchema = z.enum(['monthly', 'quarterly', 'yearly']);

const supportingDocumentSchema = z.object({
  fileName: z.string().min(1).max(255).trim(),
  url: z.string().url().max(2000),
  mimeType: z.string().max(120).trim().optional(),
});

const expenseBodySchema = z.object({
  expenseDate: z.coerce.date(),
  category: categorySchema,
  vendor: z.string().min(1).max(200).trim(),
  description: z.string().min(1).max(2000).trim(),
  amountMinor: z.coerce.number().int().positive(),
  currency: currencySchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  reference: z.string().max(120).trim().optional(),
  supportingDocument: supportingDocumentSchema.optional().nullable(),
  clientId: mongoIdSchema.optional().nullable(),
  projectId: mongoIdSchema.optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurringInterval: recurringIntervalSchema.optional().nullable(),
  idempotencyKey: z.string().min(8).max(120).trim().optional(),
});

export const createExpenseSchema = expenseBodySchema;
export const updateExpenseSchema = expenseBodySchema.partial().extend({
  expenseDate: z.coerce.date().optional(),
  amountMinor: z.coerce.number().int().positive().optional(),
});

export const listExpensesSchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
  status: statusSchema.optional(),
  category: categorySchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  clientId: mongoIdSchema.optional(),
  projectId: mongoIdSchema.optional(),
  isRecurring: z.coerce.boolean().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const expenseIdParamSchema = mongoIdParamSchema;

export const voidExpenseSchema = z.object({
  reason: z.string().min(1).max(2000).trim(),
});

export const addExpenseNoteSchema = z.object({
  note: z.string().min(1).max(2000).trim(),
});
