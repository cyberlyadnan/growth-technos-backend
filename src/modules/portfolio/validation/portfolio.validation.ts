import { z } from 'zod';
import { CmsPublicationStatus, PortfolioProjectType } from '@core/constants/cms';
import {
  cmsExternalLinksSchema,
  cmsGalleryItemSchema,
  cmsImageAssetSchema,
  cmsProcessStepSchema,
  cmsRichContentSchema,
  cmsStatisticSchema,
  cmsTechnologyItemSchema,
  cmsTestimonialSchema,
  mongoIdParamSchema,
  mongoIdSchema,
  paginationQuerySchema,
  portfolioSeoFieldsSchema,
  seoFieldsSchema,
  slugParamSchema,
} from '@core/validation/common.validation';

const tableOfContentsSchema = z.array(
  z.object({
    id: z.string().min(1),
    text: z.string().min(1).trim(),
    level: z.number().int().min(1).max(6),
  }),
);

const portfolioFieldsSchema = z
  .object({
    title: z.string().min(1).max(220).trim(),
    slug: z.string().min(1).max(220).trim().toLowerCase().optional(),
    clientName: z.string().max(160).trim().optional(),
    industryLabel: z.string().max(120).trim().optional(),
    category: z.string().max(120).trim().optional(),
    shortDescription: z.string().max(500).trim().optional(),
    fullDescription: z.string().max(15000).trim().optional(),
    challenge: z.string().max(8000).trim().optional(),
    solution: z.string().max(8000).trim().optional(),
    process: z.array(cmsProcessStepSchema).optional(),
    technologyStack: z.array(cmsTechnologyItemSchema).optional(),
    projectDuration: z.string().max(120).trim().optional(),
    servicesUsed: z.array(z.string().trim()).optional(),
    features: z.array(z.string().trim()).optional(),
    businessResults: z.array(z.string().trim()).optional(),
    statistics: z.array(cmsStatisticSchema).optional(),
    testimonial: cmsTestimonialSchema.optional().nullable(),
    gallery: z.array(cmsGalleryItemSchema).optional(),
    featuredImage: cmsImageAssetSchema.optional().nullable(),
    bannerImage: cmsImageAssetSchema.optional().nullable(),
    links: cmsExternalLinksSchema.optional(),
    content: cmsRichContentSchema.optional().nullable(),
    tableOfContents: tableOfContentsSchema.optional(),
    projectType: z.nativeEnum(PortfolioProjectType).optional(),
    industries: z.array(mongoIdSchema).optional(),
    primaryIndustry: mongoIdSchema.optional().nullable(),
    relatedServices: z.array(mongoIdSchema).optional(),
    relatedBlogs: z.array(mongoIdSchema).optional(),
    relatedPortfolio: z.array(mongoIdSchema).optional(),
    publicationStatus: z.nativeEnum(CmsPublicationStatus).optional(),
    scheduledPublishAt: z.string().datetime().optional().nullable(),
    isFeatured: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
    completionDate: z.string().max(40).trim().optional(),
    teamSize: z.string().max(80).trim().optional(),
    budget: z.string().max(80).trim().optional(),
    legacyId: z.string().max(120).trim().optional(),
  })
  .merge(seoFieldsSchema.partial())
  .merge(portfolioSeoFieldsSchema);

export const createPortfolioSchema = portfolioFieldsSchema;

export const updatePortfolioSchema = portfolioFieldsSchema.partial().extend({
  title: z.string().min(1).max(220).trim().optional(),
});

export const listPortfolioSchema = paginationQuerySchema.extend({
  publicationStatus: z.nativeEnum(CmsPublicationStatus).optional(),
  projectType: z.nativeEnum(PortfolioProjectType).optional(),
  category: z.string().max(120).trim().optional(),
  industry: mongoIdSchema.optional(),
  isFeatured: z.coerce.boolean().optional(),
  isPinned: z.coerce.boolean().optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const listPublicPortfolioSchema = paginationQuerySchema.extend({
  projectType: z.nativeEnum(PortfolioProjectType).optional(),
  category: z.string().max(120).trim().optional(),
  industry: mongoIdSchema.optional(),
  industrySlug: z.string().max(120).trim().toLowerCase().optional(),
  isFeatured: z.coerce.boolean().optional(),
  isPinned: z.coerce.boolean().optional(),
});

export const schedulePortfolioSchema = z.object({
  scheduledPublishAt: z.string().datetime(),
});

export const portfolioBulkActionSchema = z.object({
  ids: z.array(mongoIdSchema).min(1).max(100),
  action: z.enum(['delete', 'publish', 'archive', 'restore']),
});

export const portfolioIdParamSchema = mongoIdParamSchema;
export const portfolioSlugParamSchema = slugParamSchema;
