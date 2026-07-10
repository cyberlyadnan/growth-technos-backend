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
