import { z } from 'zod';
import { mongoIdParamSchema, mongoIdSchema, paginationQuerySchema } from '@core/validation/common.validation';

const frequencySchema = z.enum(['monthly', 'quarterly', 'annual', 'custom']);
const agreementStatusSchema = z.enum([
  'draft',
  'active',
  'expiring_soon',
  'expired',
  'terminated',
  'cancelled',
]);
const currencySchema = z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED']);
const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
const supportStatusSchema = z.enum([
  'open',
  'in_progress',
  'waiting_client',
  'resolved',
  'closed',
  'cancelled',
]);

const agreementBodySchema = z.object({
  clientId: mongoIdSchema,
  projectId: mongoIdSchema.optional().nullable(),
  planName: z.string().min(1).max(200).trim(),
  serviceCoverage: z.string().min(1).max(5000).trim(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  renewalDate: z.coerce.date().optional(),
  billingFrequency: frequencySchema,
  customIntervalDays: z.coerce.number().int().min(1).max(730).optional(),
  recurringChargeMinor: z.coerce.number().int().min(0),
  currency: currencySchema.optional(),
  hostingChargeMinor: z.coerce.number().int().min(0).optional(),
  domainChargeMinor: z.coerce.number().int().min(0).optional(),
  hostingIncluded: z.boolean().optional(),
  domainIncluded: z.boolean().optional(),
  includedWork: z.string().max(10000).trim().optional(),
  limitations: z.string().max(10000).trim().optional(),
  exclusions: z.string().max(10000).trim().optional(),
  responseExpectations: z.string().max(5000).trim().optional(),
  renewalTerms: z.string().max(5000).trim().optional(),
  linkedAssetIds: z.array(mongoIdSchema).max(50).optional(),
  status: agreementStatusSchema.optional(),
});

export const createAgreementSchema = agreementBodySchema;
export const updateAgreementSchema = agreementBodySchema.partial().extend({
  clientId: mongoIdSchema.optional(),
  startDate: z.coerce.date().optional(),
  recurringChargeMinor: z.coerce.number().int().min(0).optional(),
});

export const listAgreementsSchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
  clientId: mongoIdSchema.optional(),
  projectId: mongoIdSchema.optional(),
  status: agreementStatusSchema.optional(),
  renewingBefore: z.coerce.date().optional(),
});

export const agreementIdParamSchema = mongoIdParamSchema;

export const terminateAgreementSchema = z.object({
  reason: z.string().min(1).max(2000).trim(),
});

export const generateBillingSchema = z.object({
  at: z.coerce.date().optional(),
});

const supportBodySchema = z.object({
  clientId: mongoIdSchema,
  projectId: mongoIdSchema.optional().nullable(),
  agreementId: mongoIdSchema.optional().nullable(),
  assetId: mongoIdSchema.optional().nullable(),
  title: z.string().min(1).max(240).trim(),
  description: z.string().min(1).max(10000).trim(),
  priority: prioritySchema.optional(),
  assignedToUserId: mongoIdSchema.optional().nullable(),
  assignedToName: z.string().max(160).trim().optional(),
  documents: z
    .array(
      z.object({
        fileName: z.string().min(1).max(255),
        url: z.string().url().max(2000),
        mimeType: z.string().max(120).optional(),
      }),
    )
    .max(20)
    .optional(),
});

export const createSupportSchema = supportBodySchema;
export const updateSupportSchema = supportBodySchema.partial().extend({
  clientId: mongoIdSchema.optional(),
  status: supportStatusSchema.optional(),
  resolution: z.string().max(10000).trim().optional(),
});

export const listSupportSchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
  clientId: mongoIdSchema.optional(),
  projectId: mongoIdSchema.optional(),
  agreementId: mongoIdSchema.optional(),
  assetId: mongoIdSchema.optional(),
  status: supportStatusSchema.optional(),
  priority: prioritySchema.optional(),
});

export const supportIdParamSchema = mongoIdParamSchema;

export const addWorkLogSchema = z.object({
  description: z.string().min(1).max(2000).trim(),
  minutesSpent: z.coerce.number().int().min(1).max(24 * 60),
  workedAt: z.coerce.date().optional(),
});
