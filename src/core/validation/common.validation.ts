import { z } from 'zod';

export const mongoIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID');

export const mongoIdParamSchema = z.object({
  id: mongoIdSchema,
});

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(220).trim(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});

export const imageAssetSchema = z.object({
  url: z.string().url(),
  alt: z.string().max(200).trim().optional(),
  caption: z.string().max(300).trim().optional(),
  width: z.number().int().min(0).optional(),
  height: z.number().int().min(0).optional(),
});

export const seoFieldsSchema = z.object({
  slug: z.string().min(1).max(220).trim().toLowerCase().optional(),
  metaTitle: z.string().max(70).trim().optional(),
  metaDescription: z.string().max(160).trim().optional(),
  canonical: z.string().url().optional().or(z.literal('')),
  openGraph: z
    .object({
      title: z.string().trim().optional(),
      description: z.string().trim().optional(),
      image: z.string().url().optional().or(z.literal('')),
      type: z.string().trim().optional(),
      url: z.string().url().optional().or(z.literal('')),
    })
    .optional(),
  twitterCard: z
    .object({
      card: z.string().trim().optional(),
      title: z.string().trim().optional(),
      description: z.string().trim().optional(),
      image: z.string().url().optional().or(z.literal('')),
    })
    .optional(),
  schemaJson: z.record(z.string(), z.unknown()).optional(),
  robots: z.string().trim().optional(),
  indexable: z.boolean().optional(),
  breadcrumbs: z
    .array(
      z.object({
        label: z.string().min(1),
        url: z.string().min(1),
      }),
    )
    .optional(),
});

export const articleSeoFieldsSchema = z.object({
  metaKeywords: z.array(z.string().trim()).optional(),
  canonicalUrl: z.string().url().optional().or(z.literal('')),
  robotsIndex: z.boolean().optional(),
  robotsFollow: z.boolean().optional(),
  seoScore: z.number().min(0).max(100).optional(),
  faqSchema: z
    .array(
      z.object({
        question: z.string().min(1).trim(),
        answer: z.string().min(1).trim(),
      }),
    )
    .optional(),
  articleSchema: z.record(z.string(), z.unknown()).optional(),
  authorSchema: z.record(z.string(), z.unknown()).optional(),
  organizationSchema: z.record(z.string(), z.unknown()).optional(),
  breadcrumbSchema: z.record(z.string(), z.unknown()).optional(),
  includeInSitemap: z.boolean().optional(),
  includeInRss: z.boolean().optional(),
});

export const cmsImageAssetSchema = z.object({
  url: z.string().min(1),
  alt: z.string().max(200).trim().optional(),
  caption: z.string().max(300).trim().optional(),
  width: z.number().int().min(0).optional(),
  height: z.number().int().min(0).optional(),
});

export const cmsRichContentSchema = z.object({
  format: z.string().trim().optional(),
  html: z.string().optional(),
  plainText: z.string().optional(),
  document: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const cmsFeatureItemSchema = z.object({
  title: z.string().min(1).max(160).trim(),
  description: z.string().min(1).max(2000).trim(),
  icon: z.string().trim().optional(),
  iconImage: z.string().trim().optional(),
});

export const cmsTechnologyItemSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  level: z.number().min(0).max(100).optional(),
  logo: z.string().trim().optional(),
});

export const cmsFaqItemSchema = z.object({
  question: z.string().min(1).max(300).trim(),
  answer: z.string().min(1).max(5000).trim(),
});

export const cmsPricingSchema = z.object({
  starting: z.string().max(120).trim().optional(),
  timeline: z.string().max(200).trim().optional(),
  included: z.array(z.string().trim()).optional(),
  note: z.string().max(500).trim().optional(),
});

export const cmsCtaSchema = z.object({
  title: z.string().max(160).trim().optional(),
  description: z.string().max(500).trim().optional(),
  buttonLabel: z.string().max(80).trim().optional(),
  buttonUrl: z.string().trim().optional(),
});

export const cmsProcessStepSchema = z.object({
  title: z.string().min(1).max(160).trim(),
  description: z.string().max(2000).trim().optional(),
  order: z.number().int().min(0).optional(),
});

export const cmsTestimonialSchema = z.object({
  author: z.string().min(1).max(120).trim(),
  position: z.string().max(160).trim().optional(),
  text: z.string().min(1).max(3000).trim(),
  avatar: z.string().trim().optional(),
  company: z.string().max(160).trim().optional(),
});

export const cmsStatisticSchema = z.object({
  label: z.string().min(1).max(120).trim(),
  value: z.string().min(1).max(80).trim(),
  description: z.string().max(300).trim().optional(),
});

export const cmsGalleryItemSchema = z.object({
  url: z.string().min(1),
  alt: z.string().max(200).trim().optional(),
  caption: z.string().max(300).trim().optional(),
  order: z.number().int().min(0).optional(),
});

export const cmsExternalLinksSchema = z.object({
  websiteUrl: z.string().trim().optional(),
  playStoreUrl: z.string().trim().optional(),
  appStoreUrl: z.string().trim().optional(),
  githubUrl: z.string().trim().optional(),
});

export const serviceSeoFieldsSchema = z.object({
  metaKeywords: z.array(z.string().trim()).optional(),
  canonicalUrl: z.string().optional().or(z.literal('')),
  robotsIndex: z.boolean().optional(),
  robotsFollow: z.boolean().optional(),
  seoScore: z.number().min(0).max(100).optional(),
  faqSchema: z.array(cmsFaqItemSchema).optional(),
  serviceSchema: z.record(z.string(), z.unknown()).optional(),
  organizationSchema: z.record(z.string(), z.unknown()).optional(),
  breadcrumbSchema: z.record(z.string(), z.unknown()).optional(),
  includeInSitemap: z.boolean().optional(),
});

export const portfolioSeoFieldsSchema = z.object({
  metaKeywords: z.array(z.string().trim()).optional(),
  canonicalUrl: z.string().optional().or(z.literal('')),
  robotsIndex: z.boolean().optional(),
  robotsFollow: z.boolean().optional(),
  seoScore: z.number().min(0).max(100).optional(),
  creativeWorkSchema: z.record(z.string(), z.unknown()).optional(),
  organizationSchema: z.record(z.string(), z.unknown()).optional(),
  breadcrumbSchema: z.record(z.string(), z.unknown()).optional(),
  imageObjectSchema: z.record(z.string(), z.unknown()).optional(),
  includeInSitemap: z.boolean().optional(),
});
