import { z } from 'zod';
import { CmsPublicationStatus } from '@core/constants/cms';
import {
  cmsCtaSchema,
  cmsFaqItemSchema,
  cmsFeatureItemSchema,
  cmsGalleryItemSchema,
  cmsImageAssetSchema,
  cmsPricingSchema,
  cmsProcessStepSchema,
  cmsRichContentSchema,
  cmsStatisticSchema,
  cmsTechnologyItemSchema,
  cmsTestimonialSchema,
  mongoIdSchema,
} from '@core/validation/common.validation';
import {
  createTaxonomySchema,
  updateTaxonomySchema,
} from '@modules/shared/taxonomy/taxonomy.validation';

const industryHeroCtaSchema = z.object({
  label: z.string().max(80).trim().optional(),
  url: z.string().trim().optional(),
});

const industryHeroSchema = z.object({
  eyebrow: z.string().max(80).trim().optional(),
  title: z.string().max(220).trim().optional(),
  subtitle: z.string().max(500).trim().optional(),
  trustStatement: z.string().max(300).trim().optional(),
  primaryCta: industryHeroCtaSchema.optional().nullable(),
  secondaryCta: industryHeroCtaSchema.optional().nullable(),
  image: cmsImageAssetSchema.optional().nullable(),
  videoUrl: z.string().trim().optional().or(z.literal('')),
  badges: z.array(z.string().trim()).optional(),
  stats: z.array(cmsStatisticSchema).optional(),
});

const industryTrustedBySchema = z.object({
  stats: z.array(cmsStatisticSchema).optional(),
  logoNote: z.string().max(300).trim().optional(),
});

const industryProblemSchema = z.object({
  title: z.string().min(1).max(160).trim(),
  description: z.string().max(2000).trim().optional(),
  icon: z.string().trim().optional(),
});

const industrySolutionSchema = z.object({
  problemTitle: z.string().max(160).trim().optional(),
  title: z.string().min(1).max(160).trim(),
  description: z.string().min(1).max(2000).trim(),
  result: z.string().max(500).trim().optional(),
  icon: z.string().trim().optional(),
});

const industryResourceSchema = z.object({
  title: z.string().min(1).max(160).trim(),
  description: z.string().max(500).trim().optional(),
  href: z.string().min(1).trim(),
  type: z.string().max(80).trim().optional(),
});

const industryTestimonialSchema = cmsTestimonialSchema.extend({
  videoUrl: z.string().trim().optional().or(z.literal('')),
});

const industrySeoSchema = z.object({
  metaTitle: z.string().max(70).trim().optional(),
  metaDescription: z.string().max(160).trim().optional(),
  metaKeywords: z.array(z.string().trim()).optional(),
  canonicalUrl: z.string().trim().optional().or(z.literal('')),
  robotsIndex: z.boolean().optional(),
  robotsFollow: z.boolean().optional(),
  includeInSitemap: z.boolean().optional(),
  ogTitle: z.string().max(120).trim().optional(),
  ogDescription: z.string().max(300).trim().optional(),
  ogImage: z.string().trim().optional().or(z.literal('')),
  twitterTitle: z.string().max(120).trim().optional(),
  twitterDescription: z.string().max(300).trim().optional(),
  twitterImage: z.string().trim().optional().or(z.literal('')),
  faqSchema: z.boolean().optional(),
});

const industryFieldsSchema = z.object({
  shortDescription: z.string().max(500).trim().optional(),
  fullDescription: z.string().max(10000).trim().optional(),
  icon: z.string().trim().optional(),
  isFeatured: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  publicationStatus: z.nativeEnum(CmsPublicationStatus).optional(),
  publishedAt: z.coerce.date().optional().nullable(),
  hero: industryHeroSchema.optional().nullable(),
  trustedBy: industryTrustedBySchema.optional().nullable(),
  problems: z.array(industryProblemSchema).optional(),
  solutions: z.array(industrySolutionSchema).optional(),
  benefits: z.array(cmsFeatureItemSchema).optional(),
  businessResults: z.array(cmsStatisticSchema).optional(),
  process: z.array(cmsProcessStepSchema).optional(),
  whyUs: z.array(cmsFeatureItemSchema).optional(),
  technology: z.array(cmsTechnologyItemSchema).optional(),
  pricing: cmsPricingSchema.optional().nullable(),
  faqs: z.array(cmsFaqItemSchema).optional(),
  resources: z.array(industryResourceSchema).optional(),
  auditCta: cmsCtaSchema.optional().nullable(),
  finalCta: cmsCtaSchema.optional().nullable(),
  bannerImage: cmsImageAssetSchema.optional().nullable(),
  gallery: z.array(cmsGalleryItemSchema).optional(),
  content: cmsRichContentSchema.optional().nullable(),
  testimonials: z.array(industryTestimonialSchema).optional(),
  relatedServices: z.array(mongoIdSchema).optional(),
  relatedPortfolio: z.array(mongoIdSchema).optional(),
  relatedBlogs: z.array(mongoIdSchema).optional(),
});

export const createIndustrySchema = createTaxonomySchema
  .extend({
    description: z.string().max(2000).trim().optional(),
  })
  .merge(industryFieldsSchema)
  .merge(industrySeoSchema);

export const updateIndustrySchema = updateTaxonomySchema
  .extend({
    description: z.string().max(2000).trim().optional(),
  })
  .merge(industryFieldsSchema.partial())
  .merge(industrySeoSchema);
