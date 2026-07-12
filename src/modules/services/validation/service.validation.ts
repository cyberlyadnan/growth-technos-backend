import { z } from 'zod';
import { CmsPublicationStatus, ServiceKind } from '@core/constants/cms';
import {
  cmsCtaSchema,
  cmsFaqItemSchema,
  cmsFeatureItemSchema,
  cmsImageAssetSchema,
  cmsPricingSchema,
  cmsProcessStepSchema,
  cmsRichContentSchema,
  cmsTechnologyItemSchema,
  mongoIdParamSchema,
  mongoIdSchema,
  paginationQuerySchema,
  seoFieldsSchema,
  serviceSeoFieldsSchema,
  slugParamSchema,
} from '@core/validation/common.validation';

const tableOfContentsSchema = z.array(
  z.object({
    id: z.string().min(1),
    text: z.string().min(1).trim(),
    level: z.number().int().min(1).max(6),
  }),
);

const serviceFieldsSchema = z
  .object({
    title: z.string().min(1).max(220).trim(),
    slug: z.string().min(1).max(220).trim().toLowerCase().optional(),
    shortDescription: z.string().max(500).trim().optional(),
    fullDescription: z.string().max(10000).trim().optional(),
    heroTitle: z.string().max(220).trim().optional(),
    heroSubtitle: z.string().max(500).trim().optional(),
    heroImage: cmsImageAssetSchema.optional().nullable(),
    bannerImage: cmsImageAssetSchema.optional().nullable(),
    icon: z.string().max(80).trim().optional(),
    iconBg: z.string().max(120).trim().optional(),
    iconColor: z.string().max(120).trim().optional(),
    kind: z.nativeEnum(ServiceKind).optional(),
    categorySlug: z.string().max(120).trim().toLowerCase().optional(),
    categoryTitle: z.string().max(160).trim().optional(),
    parentService: mongoIdSchema.optional().nullable(),
    industries: z.array(mongoIdSchema).optional(),
    primaryIndustry: mongoIdSchema.optional().nullable(),
    technologyStack: z.array(cmsTechnologyItemSchema).optional(),
    features: z.array(cmsFeatureItemSchema).optional(),
    benefits: z.array(z.string().trim()).optional(),
    process: z.array(cmsProcessStepSchema).optional(),
    pricing: cmsPricingSchema.optional().nullable(),
    deliverables: z.array(z.string().trim()).optional(),
    timeline: z.string().max(200).trim().optional(),
    cta: cmsCtaSchema.optional().nullable(),
    faqs: z.array(cmsFaqItemSchema).optional(),
    content: cmsRichContentSchema.optional().nullable(),
    tableOfContents: tableOfContentsSchema.optional(),
    relatedServices: z.array(mongoIdSchema).optional(),
    relatedBlogs: z.array(mongoIdSchema).optional(),
    relatedPortfolio: z.array(mongoIdSchema).optional(),
    publicationStatus: z.nativeEnum(CmsPublicationStatus).optional(),
    scheduledPublishAt: z.string().datetime().optional().nullable(),
    isFeatured: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
  })
  .merge(seoFieldsSchema.partial())
  .merge(serviceSeoFieldsSchema);

export const createServiceSchema = serviceFieldsSchema;

export const updateServiceSchema = serviceFieldsSchema.partial().extend({
  title: z.string().min(1).max(220).trim().optional(),
});

export const listServicesSchema = paginationQuerySchema.extend({
  publicationStatus: z.nativeEnum(CmsPublicationStatus).optional(),
  kind: z.nativeEnum(ServiceKind).optional(),
  categorySlug: z.string().max(120).trim().toLowerCase().optional(),
  parentService: mongoIdSchema.optional(),
  industry: mongoIdSchema.optional(),
  isFeatured: z.coerce.boolean().optional(),
  isPinned: z.coerce.boolean().optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const listPublicServicesSchema = paginationQuerySchema.extend({
  kind: z.nativeEnum(ServiceKind).optional(),
  categorySlug: z.string().max(120).trim().toLowerCase().optional(),
  parentService: mongoIdSchema.optional(),
  industry: mongoIdSchema.optional(),
  industrySlug: z.string().max(120).trim().toLowerCase().optional(),
  isFeatured: z.coerce.boolean().optional(),
  isPinned: z.coerce.boolean().optional(),
});

export const scheduleServiceSchema = z.object({
  scheduledPublishAt: z.string().datetime(),
});

export const serviceBulkActionSchema = z.object({
  ids: z.array(mongoIdSchema).min(1).max(100),
  action: z.enum(['delete', 'publish', 'archive', 'restore']),
});

export const serviceIdParamSchema = mongoIdParamSchema;
export const serviceSlugParamSchema = slugParamSchema;
