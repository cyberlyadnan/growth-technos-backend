import { z } from 'zod';
import {
  BlogContentFormat,
  BlogDifficultyLevel,
  BlogPublicationStatus,
} from '@core/constants';
import {
  articleSeoFieldsSchema,
  imageAssetSchema,
  mongoIdParamSchema,
  mongoIdSchema,
  paginationQuerySchema,
  seoFieldsSchema,
  slugParamSchema,
} from '@core/validation/common.validation';

const blogContentSchema = z.object({
  format: z.nativeEnum(BlogContentFormat).optional(),
  document: z.record(z.string(), z.unknown()).optional(),
  html: z.string().optional(),
  plainText: z.string().optional(),
});

const tableOfContentsSchema = z.array(
  z.object({
    id: z.string().min(1),
    text: z.string().min(1).trim(),
    level: z.number().int().min(1).max(6),
  }),
);

const blogFieldsSchema = z
  .object({
    title: z.string().min(1).max(220).trim(),
    slug: z.string().min(1).max(220).trim().toLowerCase().optional(),
    excerpt: z.string().max(500).trim().optional(),
    summary: z.string().max(1200).trim().optional(),
    featuredImage: imageAssetSchema.optional().nullable(),
    thumbnail: imageAssetSchema.optional().nullable(),
    bannerImage: imageAssetSchema.optional().nullable(),
    content: blogContentSchema.optional(),
    category: mongoIdSchema.optional().nullable(),
    tags: z.array(mongoIdSchema).optional(),
    topicCluster: mongoIdSchema.optional().nullable(),
    industry: mongoIdSchema.optional().nullable(),
    author: mongoIdSchema,
    difficultyLevel: z.nativeEnum(BlogDifficultyLevel).optional(),
    publicationStatus: z.nativeEnum(BlogPublicationStatus).optional(),
    scheduledPublishAt: z.string().datetime().optional().nullable(),
    isFeatured: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    isTrending: z.boolean().optional(),
    allowComments: z.boolean().optional(),
    tableOfContents: tableOfContentsSchema.optional(),
    relatedServices: z.array(mongoIdSchema).optional(),
    relatedBlogs: z.array(mongoIdSchema).optional(),
    relatedPortfolio: z.array(mongoIdSchema).optional(),
  })
  .merge(seoFieldsSchema.partial())
  .merge(articleSeoFieldsSchema);

export const createBlogSchema = blogFieldsSchema;

export const updateBlogSchema = blogFieldsSchema.partial().extend({
  title: z.string().min(1).max(220).trim().optional(),
  author: mongoIdSchema.optional(),
});

export const listBlogsSchema = paginationQuerySchema.extend({
  publicationStatus: z.nativeEnum(BlogPublicationStatus).optional(),
  category: mongoIdSchema.optional(),
  tag: mongoIdSchema.optional(),
  author: mongoIdSchema.optional(),
  industry: mongoIdSchema.optional(),
  topicCluster: mongoIdSchema.optional(),
  isFeatured: z.coerce.boolean().optional(),
  isPinned: z.coerce.boolean().optional(),
  isTrending: z.coerce.boolean().optional(),
  difficultyLevel: z.nativeEnum(BlogDifficultyLevel).optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const listPublicBlogsSchema = paginationQuerySchema.extend({
  category: mongoIdSchema.optional(),
  categorySlug: z.string().min(1).max(120).trim().toLowerCase().optional(),
  tag: mongoIdSchema.optional(),
  tagSlug: z.string().min(1).max(120).trim().toLowerCase().optional(),
  author: mongoIdSchema.optional(),
  authorSlug: z.string().min(1).max(120).trim().toLowerCase().optional(),
  industry: mongoIdSchema.optional(),
  industrySlug: z.string().min(1).max(120).trim().toLowerCase().optional(),
  topicCluster: mongoIdSchema.optional(),
  isFeatured: z.coerce.boolean().optional(),
  isTrending: z.coerce.boolean().optional(),
});

export const scheduleBlogSchema = z.object({
  scheduledPublishAt: z.string().datetime(),
});

export const autosaveBlogSchema = z.object({
  title: z.string().max(220).trim().optional(),
  excerpt: z.string().max(500).trim().optional(),
  summary: z.string().max(1200).trim().optional(),
  content: blogContentSchema.optional(),
  featuredImage: imageAssetSchema.optional().nullable(),
  thumbnail: imageAssetSchema.optional().nullable(),
  bannerImage: imageAssetSchema.optional().nullable(),
  category: mongoIdSchema.optional().nullable(),
  tags: z.array(mongoIdSchema).optional(),
  topicCluster: mongoIdSchema.optional().nullable(),
  industry: mongoIdSchema.optional().nullable(),
  author: mongoIdSchema.optional(),
  seo: z.record(z.string(), z.unknown()).optional(),
});

export const blogBulkActionSchema = z.object({
  ids: z.array(mongoIdSchema).min(1).max(100),
  action: z.enum(['delete', 'publish', 'archive', 'restore']),
});

export const blogIdParamSchema = mongoIdParamSchema;
export const blogSlugParamSchema = slugParamSchema;
