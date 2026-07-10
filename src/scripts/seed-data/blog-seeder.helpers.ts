import { Types } from 'mongoose';
import {
  BlogContentFormat,
  BlogDifficultyLevel,
  BlogPublicationStatus,
} from '@core/constants';
import { calculateBlogSeoScore } from '@core/utils/blog-seo-score';
import { calculateReadingTimeMinutes, stripHtml } from '@core/utils/reading-time';
import { sanitizeBlogHtml } from '@core/utils/sanitize-html';
import { Author } from '@modules/authors/model/author.model';
import { Blog } from '@modules/blogs/model/blog.model';
import { Category } from '@modules/categories/model/category.model';
import { Industry } from '@modules/industries/model/industry.model';
import { Tag } from '@modules/tags/model/tag.model';
import { TopicCluster } from '@modules/topic-clusters/model/topic-cluster.model';
import type { ITableOfContentsItem } from '@core/schemas/blog-seo.schema';

export const SITE_URL = (process.env.APP_URL ?? 'https://growthtechnos.com').replace(/\/$/, '');
export const UPLOAD_PREFIX = process.env.BLOG_UPLOAD_URL_PREFIX ?? '/uploads/blogs';

export function blogImagePath(filename: string): string {
  return `${UPLOAD_PREFIX}/${filename}`;
}

export function blogCanonical(slug: string): string {
  return `${SITE_URL}/blog/${slug}`;
}

export function blogOgImage(filename: string): string {
  return `${SITE_URL}${blogImagePath(filename)}`;
}

function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trim()}…`;
}

type TaxonomySeed = {
  slug: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
};

export async function upsertAuthor(seed: {
  slug: string;
  name: string;
  designation?: string;
  bio?: string;
  photo?: string;
  website?: string;
}): Promise<Types.ObjectId> {
  const doc = await Author.findOneAndUpdate(
    { slug: seed.slug, isDeleted: { $ne: true } },
    {
      $set: {
        name: seed.name,
        designation: seed.designation,
        bio: seed.bio,
        photo: seed.photo,
        website: seed.website,
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc._id;
}

export async function upsertCategory(seed: TaxonomySeed): Promise<Types.ObjectId> {
  const doc = await Category.findOneAndUpdate(
    { slug: seed.slug, isDeleted: { $ne: true } },
    {
      $set: {
        name: seed.name,
        description: seed.description,
        isActive: true,
        sortOrder: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc._id;
}

export async function upsertTag(seed: TaxonomySeed): Promise<Types.ObjectId> {
  const doc = await Tag.findOneAndUpdate(
    { slug: seed.slug, isDeleted: { $ne: true } },
    {
      $set: {
        name: seed.name,
        description: seed.description,
        color: seed.color,
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc._id;
}

export async function upsertIndustry(seed: TaxonomySeed): Promise<Types.ObjectId> {
  const doc = await Industry.findOneAndUpdate(
    { slug: seed.slug, isDeleted: { $ne: true } },
    {
      $set: {
        name: seed.name,
        description: seed.description,
        icon: seed.icon,
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc._id;
}

export async function upsertTopicCluster(seed: TaxonomySeed): Promise<Types.ObjectId> {
  const doc = await TopicCluster.findOneAndUpdate(
    { slug: seed.slug, isDeleted: { $ne: true } },
    {
      $set: {
        name: seed.name,
        description: seed.description,
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc._id;
}

export type BlogPostSeed = {
  slug: string;
  title: string;
  excerpt: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  featuredImageFile: string;
  bannerImageFile: string;
  thumbnailFile?: string;
  categorySlug: string;
  tagSlugs: string[];
  topicClusterSlug: string;
  industrySlug: string;
  authorSlug: string;
  isFeatured: boolean;
  isPinned: boolean;
  isTrending: boolean;
  allowComments: boolean;
  viewCount: number;
  likeCount: number;
  difficultyLevel: BlogDifficultyLevel;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  html: string;
  tableOfContents: ITableOfContentsItem[];
  faqSchema: Array<{ question: string; answer: string }>;
};

export async function upsertBlog(
  seed: BlogPostSeed,
  refs: {
    authorId: Types.ObjectId;
    categoryId: Types.ObjectId;
    tagIds: Types.ObjectId[];
    topicClusterId: Types.ObjectId;
    industryId: Types.ObjectId;
  },
): Promise<{ id: string; slug: string; created: boolean }> {
  const html = sanitizeBlogHtml(seed.html);
  const plainText = stripHtml(html);
  const readingTimeMinutes = calculateReadingTimeMinutes(plainText);
  const canonicalUrl = blogCanonical(seed.slug);
  const featuredImageUrl = blogImagePath(seed.featuredImageFile);
  const ogImage = blogOgImage(seed.featuredImageFile);

  const seoScore = calculateBlogSeoScore({
    title: seed.title,
    slug: seed.slug,
    excerpt: seed.excerpt,
    metaTitle: seed.metaTitle,
    metaDescription: seed.metaDescription,
    metaKeywords: seed.metaKeywords,
    canonicalUrl,
    featuredImageUrl,
    plainText,
    tableOfContentsCount: seed.tableOfContents.length,
    robotsIndex: true,
    includeInSitemap: true,
  }).score;

  const payload = {
    title: seed.title,
    slug: seed.slug,
    excerpt: seed.excerpt,
    summary: seed.summary,
    featuredImage: {
      url: featuredImageUrl,
      alt: seed.title,
      width: 1200,
      height: 630,
    },
    thumbnail: {
      url: blogImagePath(seed.thumbnailFile ?? seed.featuredImageFile),
      alt: seed.title,
      width: 600,
      height: 400,
    },
    bannerImage: {
      url: blogImagePath(seed.bannerImageFile),
      alt: seed.title,
      width: 1600,
      height: 900,
    },
    content: {
      format: BlogContentFormat.TIPTAP,
      document: {},
      html,
      plainText,
    },
    category: refs.categoryId,
    tags: refs.tagIds,
    topicCluster: refs.topicClusterId,
    industry: refs.industryId,
    author: refs.authorId,
    readingTimeMinutes,
    difficultyLevel: seed.difficultyLevel,
    publicationStatus: BlogPublicationStatus.PUBLISHED,
    publishedAt: seed.publishedAt,
    isFeatured: seed.isFeatured,
    isPinned: seed.isPinned,
    isTrending: seed.isTrending,
    allowComments: seed.allowComments,
    viewCount: seed.viewCount,
    likeCount: seed.likeCount,
    tableOfContents: seed.tableOfContents,
    metaTitle: clampText(seed.metaTitle, 70),
    metaDescription: clampText(seed.metaDescription, 160),
    metaKeywords: seed.metaKeywords,
    canonical: canonicalUrl,
    canonicalUrl,
    openGraph: {
      title: seed.metaTitle,
      description: seed.metaDescription,
      image: ogImage,
      type: 'article',
      url: canonicalUrl,
    },
    twitterCard: {
      card: 'summary_large_image',
      title: seed.metaTitle,
      description: seed.metaDescription,
      image: ogImage,
    },
    robots: 'index, follow',
    indexable: true,
    robotsIndex: true,
    robotsFollow: true,
    seoScore,
    faqSchema: seed.faqSchema,
    includeInSitemap: true,
    includeInRss: true,
    isDeleted: false,
    createdAt: seed.createdAt,
    updatedAt: seed.updatedAt,
  };

  const existing = await Blog.findOne({ slug: seed.slug, isDeleted: { $ne: true } });

  if (existing) {
    const { createdAt: _createdAt, ...updatePayload } = payload;
    await Blog.updateOne(
      { _id: existing._id },
      { $set: { ...updatePayload, updatedAt: seed.updatedAt } },
    );
    return { id: existing.id, slug: seed.slug, created: false };
  }

  const created = await Blog.create(payload);
  return { id: created.id, slug: seed.slug, created: true };
}
