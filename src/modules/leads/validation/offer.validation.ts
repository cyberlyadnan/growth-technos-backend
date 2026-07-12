import { z } from 'zod';
import { CtaActionType, DeviceType, OfferType, PageType } from '@core/constants/leads';
import { EntityStatus } from '@core/schemas/base.schema';
import {
  cmsImageAssetSchema,
  mongoIdParamSchema,
  mongoIdSchema,
  paginationQuerySchema,
} from '@core/validation/common.validation';

export const displayRulesZod = z
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

export const ctaActionZod = z
  .object({
    type: z.nativeEnum(CtaActionType).optional(),
    label: z.string().max(120).trim().optional(),
    url: z.string().max(2000).trim().optional(),
    formId: mongoIdSchema.nullable().optional(),
    offerId: mongoIdSchema.nullable().optional(),
    magnetId: mongoIdSchema.nullable().optional(),
    popupId: mongoIdSchema.nullable().optional(),
    phone: z.string().max(40).trim().optional(),
    whatsappNumber: z.string().max(40).trim().optional(),
  })
  .optional();

export const createOfferSchema = z.object({
  title: z.string().min(1).max(220).trim(),
  description: z.string().max(3000).trim().optional(),
  offerType: z.nativeEnum(OfferType).optional(),
  valueLabel: z.string().max(120).trim().optional(),
  bannerText: z.string().max(300).trim().optional(),
  countdownEnabled: z.boolean().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  ctaAction: ctaActionZod,
  applicableIndustries: z.array(z.string().trim()).optional(),
  applicableServices: z.array(z.string().trim()).optional(),
  displayRules: displayRulesZod,
  priority: z.number().int().min(0).max(1000).optional(),
  campaignId: mongoIdSchema.nullable().optional(),
  status: z.nativeEnum(EntityStatus).optional(),
});

export const updateOfferSchema = createOfferSchema.partial();

export const listOffersSchema = paginationQuerySchema.extend({
  status: z.nativeEnum(EntityStatus).optional(),
  offerType: z.nativeEnum(OfferType).optional(),
  industry: z.string().max(120).trim().optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const publicOffersQuerySchema = z.object({
  industry: z.string().max(120).trim().optional(),
  service: z.string().max(120).trim().optional(),
  pageType: z.nativeEnum(PageType).optional(),
  pagePath: z.string().max(2000).trim().optional(),
  device: z.nativeEnum(DeviceType).optional(),
  limit: z.coerce.number().int().positive().max(20).optional(),
});

export const offerIdParamSchema = mongoIdParamSchema;

export const createLeadMagnetSchema = z.object({
  title: z.string().min(1).max(220).trim(),
  description: z.string().max(3000).trim().optional(),
  value: z.string().max(120).trim().optional(),
  benefits: z.array(z.string().max(300).trim()).optional(),
  icon: z.string().max(80).trim().optional(),
  image: cmsImageAssetSchema.nullable().optional(),
  ctaAction: ctaActionZod,
  landingUrl: z.string().max(2000).trim().optional(),
  formId: mongoIdSchema.nullable().optional(),
  displayRules: displayRulesZod,
  campaignId: mongoIdSchema.nullable().optional(),
  status: z.nativeEnum(EntityStatus).optional(),
});

export const updateLeadMagnetSchema = createLeadMagnetSchema.partial();

export const listLeadMagnetsSchema = paginationQuerySchema.extend({
  status: z.nativeEnum(EntityStatus).optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const publicMagnetsQuerySchema = publicOffersQuerySchema;

export const leadMagnetIdParamSchema = mongoIdParamSchema;
