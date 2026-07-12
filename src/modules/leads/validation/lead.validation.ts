import { z } from 'zod';
import {
  DeviceType,
  FormFieldType,
  LeadSource,
  LeadStatus,
  LeadType,
  PageType,
} from '@core/constants/leads';
import { EntityStatus } from '@core/schemas/base.schema';
import {
  mongoIdParamSchema,
  mongoIdSchema,
  paginationQuerySchema,
  slugParamSchema,
} from '@core/validation/common.validation';

const displayRulesSchema = z
  .object({
    industries: z.array(z.string().trim()).optional(),
    services: z.array(z.string().trim()).optional(),
    pagePaths: z.array(z.string().trim()).optional(),
    pageTypes: z.array(z.nativeEnum(PageType)).optional(),
    devices: z.array(z.nativeEnum(DeviceType)).optional(),
    excludePaths: z.array(z.string().trim()).optional(),
    priority: z.number().int().min(0).max(1000).optional(),
    startAt: z.coerce.date().nullable().optional(),
    endAt: z.coerce.date().nullable().optional(),
  })
  .optional();

const microcopySchema = z
  .object({
    trustLine: z.string().max(300).trim().optional(),
    responseTimeLine: z.string().max(300).trim().optional(),
    consentLabel: z.string().max(500).trim().optional(),
    privacyNote: z.string().max(500).trim().optional(),
    submitLabel: z.string().max(80).trim().optional(),
  })
  .optional();

const redirectRulesSchema = z
  .object({
    mode: z.enum(['thank_you_page', 'path', 'none']).optional(),
    thankYouSlug: z.string().max(220).trim().toLowerCase().optional(),
    path: z.string().max(2000).trim().optional(),
    openInNewTab: z.boolean().optional(),
  })
  .optional();

const leadFormFieldSchema = z.object({
  key: z.string().min(1).max(80).trim(),
  label: z.string().min(1).max(160).trim(),
  type: z.nativeEnum(FormFieldType),
  required: z.boolean().optional(),
  options: z.array(z.string().trim()).optional(),
  order: z.number().int().min(0).optional(),
  placeholder: z.string().max(200).trim().optional(),
  helpText: z.string().max(500).trim().optional(),
  step: z.number().int().min(1).max(20).optional(),
  defaultValue: z.string().max(500).trim().optional(),
});

export const createLeadFormSchema = z.object({
  name: z.string().min(1).max(160).trim(),
  slug: z.string().min(1).max(220).trim().toLowerCase().optional(),
  title: z.string().max(220).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  fields: z.array(leadFormFieldSchema).optional(),
  microcopy: microcopySchema,
  successMessageId: mongoIdSchema.nullable().optional(),
  thankYouPageId: mongoIdSchema.nullable().optional(),
  redirectRules: redirectRulesSchema,
  honeypotEnabled: z.boolean().optional(),
  displayRules: displayRulesSchema,
  status: z.nativeEnum(EntityStatus).optional(),
});

export const updateLeadFormSchema = createLeadFormSchema.partial();

export const listLeadFormsSchema = paginationQuerySchema.extend({
  status: z.nativeEnum(EntityStatus).optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const leadFormIdParamSchema = mongoIdParamSchema;
export const leadFormSlugParamSchema = slugParamSchema;

const utmSchema = z
  .object({
    utmSource: z.string().max(200).trim().optional(),
    utmMedium: z.string().max(200).trim().optional(),
    utmCampaign: z.string().max(200).trim().optional(),
    utmTerm: z.string().max(200).trim().optional(),
    utmContent: z.string().max(200).trim().optional(),
  })
  .optional();

export const submitLeadSchema = z
  .object({
    formSlug: z.string().min(1).max(220).trim().toLowerCase().optional(),
    formId: mongoIdSchema.optional(),
    name: z.string().max(160).trim().optional(),
    businessName: z.string().max(200).trim().optional(),
    email: z.string().email().max(254).trim().toLowerCase().optional(),
    phone: z.string().max(40).trim().optional(),
    whatsapp: z.string().max(40).trim().optional(),
    industry: z.string().max(120).trim().optional(),
    businessType: z.string().max(120).trim().optional(),
    serviceInterested: z.string().max(200).trim().optional(),
    monthlyBudget: z.string().max(80).trim().optional(),
    city: z.string().max(120).trim().optional(),
    message: z.string().max(5000).trim().optional(),
    consent: z.boolean().optional(),
    customFields: z.record(z.string(), z.unknown()).optional(),
    leadType: z.nativeEnum(LeadType).optional(),
    source: z.nativeEnum(LeadSource).optional(),
    campaignId: mongoIdSchema.optional(),
    offerId: mongoIdSchema.optional(),
    magnetId: mongoIdSchema.optional(),
    popupId: mongoIdSchema.optional(),
    landingPage: z.string().max(2000).trim().optional(),
    referrer: z.string().max(2000).trim().optional(),
    utm: utmSchema,
    website: z.string().max(200).optional(),
  })
  .refine((data) => Boolean(data.formSlug || data.formId), {
    message: 'formSlug or formId is required',
    path: ['formSlug'],
  });

export const listLeadsSchema = paginationQuerySchema.extend({
  status: z.nativeEnum(LeadStatus).optional(),
  source: z.nativeEnum(LeadSource).optional(),
  industry: z.string().max(120).trim().optional(),
  formId: mongoIdSchema.optional(),
  campaignId: mongoIdSchema.optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const updateLeadSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  notes: z.string().max(5000).trim().optional(),
  assignedTo: mongoIdSchema.nullable().optional(),
  score: z.number().min(0).max(100).nullable().optional(),
  scoreBreakdown: z
    .object({
      industry: z.number().optional(),
      service: z.number().optional(),
      budget: z.number().optional(),
      source: z.number().optional(),
      engagement: z.number().optional(),
      custom: z.record(z.string(), z.number()).optional(),
    })
    .nullable()
    .optional(),
  name: z.string().max(160).trim().optional(),
  email: z.string().email().max(254).trim().toLowerCase().optional(),
  phone: z.string().max(40).trim().optional(),
  businessName: z.string().max(200).trim().optional(),
  industry: z.string().max(120).trim().optional(),
  serviceInterested: z.string().max(200).trim().optional(),
  message: z.string().max(5000).trim().optional(),
});

export const leadIdParamSchema = mongoIdParamSchema;
