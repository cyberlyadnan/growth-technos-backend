import { z } from 'zod';
import { mongoIdParamSchema, mongoIdSchema, paginationQuerySchema } from '@core/validation/common.validation';

const currencySchema = z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED']);
const statusSchema = z.enum(['draft', 'issued', 'accepted', 'rejected', 'expired', 'revised']);
const taxModeSchema = z.enum(['exclusive', 'inclusive', 'none']);

const taxRateSchema = z.object({
  name: z.string().min(1).max(80).trim(),
  percent: z.coerce.number().min(0).max(100),
});

const taxConfigSchema = z.object({
  mode: taxModeSchema,
  rates: z.array(taxRateSchema).max(10).default([]),
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

const quotationBodyObjectSchema = z.object({
  clientId: mongoIdSchema,
  projectId: mongoIdSchema.optional().nullable(),
  title: z.string().min(1).max(240).trim(),
  issueDate: z.coerce.date().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  validityDays: z.coerce.number().int().min(1).max(365).optional(),
  currency: currencySchema.optional(),
  taxConfig: taxConfigSchema.optional(),
  documentDiscountPercent: z.coerce.number().min(0).max(100).optional(),
  documentDiscountMinor: z.coerce.number().int().min(0).optional(),
  lineItems: z.array(lineItemInputSchema).min(1).max(100),
  scopeOfWork: z.string().max(10000).trim().optional(),
  exclusions: z.string().max(5000).trim().optional(),
  assumptions: z.string().max(5000).trim().optional(),
  deliveryTimeline: z.string().max(5000).trim().optional(),
  paymentMilestones: z.string().max(5000).trim().optional(),
  terms: z.string().max(10000).trim().optional(),
  internalNotes: z.string().max(5000).trim().optional(),
  templateId: mongoIdSchema.optional().nullable(),
});

export const createQuotationSchema = quotationBodyObjectSchema;

export const updateQuotationSchema = quotationBodyObjectSchema.partial().extend({
  clientId: mongoIdSchema.optional(),
  lineItems: z.array(lineItemInputSchema).min(1).max(100).optional(),
});

export const listQuotationsSchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
  status: statusSchema.optional(),
  clientId: mongoIdSchema.optional(),
  projectId: mongoIdSchema.optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
  documentGroupId: mongoIdSchema.optional(),
});

export const quotationIdParamSchema = mongoIdParamSchema;

export const rejectQuotationSchema = z.object({
  reason: z.string().max(2000).trim().optional(),
});

export const reviseQuotationSchema = z.object({
  note: z.string().max(2000).trim().optional(),
});

export const convertToProjectSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  billingModel: z
    .enum(['fixed_price', 'milestone_based', 'hourly', 'recurring', 'custom'])
    .optional(),
});

export const addQuotationNoteSchema = z.object({
  note: z.string().min(1).max(2000).trim(),
});

export const createCatalogItemSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  unit: z.string().max(40).trim().optional(),
  unitPriceMinor: z.coerce.number().int().min(0),
  currency: currencySchema.optional(),
  serviceId: mongoIdSchema.optional().nullable(),
  category: z.string().max(120).trim().optional(),
  isActive: z.boolean().optional(),
});

export const updateCatalogItemSchema = createCatalogItemSchema.partial();

export const listCatalogItemsSchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
  category: z.string().max(120).trim().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  titleDefault: z.string().max(240).trim().optional(),
  currency: currencySchema.optional(),
  taxConfig: taxConfigSchema.optional(),
  lineItems: z.array(lineItemInputSchema).max(100).optional(),
  scopeOfWork: z.string().max(10000).trim().optional(),
  exclusions: z.string().max(5000).trim().optional(),
  assumptions: z.string().max(5000).trim().optional(),
  deliveryTimeline: z.string().max(5000).trim().optional(),
  paymentMilestones: z.string().max(5000).trim().optional(),
  terms: z.string().max(10000).trim().optional(),
  validityDays: z.coerce.number().int().min(1).max(365).optional(),
  isActive: z.boolean().optional(),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const listTemplatesSchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const previewTotalsSchema = z.object({
  currency: currencySchema.optional(),
  taxConfig: taxConfigSchema,
  lineItems: z.array(lineItemInputSchema).min(1).max(100),
  documentDiscountPercent: z.coerce.number().min(0).max(100).optional(),
  documentDiscountMinor: z.coerce.number().int().min(0).optional(),
});
