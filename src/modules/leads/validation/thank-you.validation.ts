import { z } from 'zod';
import { ThankYouPageType } from '@core/constants/leads';
import { EntityStatus } from '@core/schemas/base.schema';
import {
  mongoIdParamSchema,
  paginationQuerySchema,
  slugParamSchema,
} from '@core/validation/common.validation';
import { ctaActionZod } from './offer.validation';

const resourceLinkZod = z.object({
  title: z.string().min(1).max(200).trim(),
  url: z.string().min(1).max(2000).trim(),
  description: z.string().max(500).trim().optional(),
});

const nextStepZod = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  order: z.number().int().min(0).optional(),
});

export const createThankYouPageSchema = z.object({
  slug: z.string().min(1).max(220).trim().toLowerCase().optional(),
  type: z.nativeEnum(ThankYouPageType).optional(),
  headline: z.string().min(1).max(220).trim(),
  body: z.string().max(5000).trim().optional(),
  nextSteps: z.array(nextStepZod).optional(),
  timelineText: z.string().max(500).trim().optional(),
  downloadLinks: z.array(resourceLinkZod).optional(),
  relatedResources: z.array(resourceLinkZod).optional(),
  calendarEmbedUrl: z.string().max(2000).trim().optional().or(z.literal('')),
  metaTitle: z.string().max(70).trim().optional(),
  metaDescription: z.string().max(160).trim().optional(),
  indexable: z.boolean().optional(),
  status: z.nativeEnum(EntityStatus).optional(),
});

export const updateThankYouPageSchema = createThankYouPageSchema.partial();

export const listThankYouPagesSchema = paginationQuerySchema.extend({
  status: z.nativeEnum(EntityStatus).optional(),
  type: z.nativeEnum(ThankYouPageType).optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const thankYouIdParamSchema = mongoIdParamSchema;
export const thankYouSlugParamSchema = slugParamSchema;

export const createSuccessMessageSchema = z.object({
  name: z.string().min(1).max(160).trim(),
  headline: z.string().min(1).max(220).trim(),
  body: z.string().max(3000).trim().optional(),
  secondaryCta: ctaActionZod.nullable().optional(),
  status: z.nativeEnum(EntityStatus).optional(),
});

export const updateSuccessMessageSchema = createSuccessMessageSchema.partial();

export const listSuccessMessagesSchema = paginationQuerySchema.extend({
  status: z.nativeEnum(EntityStatus).optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const successMessageIdParamSchema = mongoIdParamSchema;
