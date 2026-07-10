import {
  BlogContentFormat,
  BlogDifficultyLevel,
  BlogPublicationStatus,
} from '@core/constants';

export interface TaxonomyRef {
  id: string;
  name: string;
  slug: string;
}

export interface TagRef extends TaxonomyRef {
  color?: string;
}

export interface AuthorRef extends TaxonomyRef {
  photo?: string;
  designation?: string;
}

export interface IndustryRef extends TaxonomyRef {
  icon?: string;
}

export interface BlogImageAsset {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface BlogContent {
  format: BlogContentFormat;
  document: Record<string, unknown>;
  html: string;
  plainText?: string;
}

export interface BlogResponse {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  summary?: string;
  featuredImage?: BlogImageAsset;
  thumbnail?: BlogImageAsset;
  bannerImage?: BlogImageAsset;
  content: BlogContent;
  category?: TaxonomyRef;
  tags: TagRef[];
  topicCluster?: TaxonomyRef;
  industry?: IndustryRef;
  author: AuthorRef;
  readingTimeMinutes: number;
  difficultyLevel: BlogDifficultyLevel;
  publicationStatus: BlogPublicationStatus;
  publishedAt?: string;
  scheduledPublishAt?: string;
  unpublishedAt?: string;
  isFeatured: boolean;
  isPinned: boolean;
  isTrending: boolean;
  allowComments: boolean;
  viewCount: number;
  likeCount: number;
  tableOfContents: Array<{ id: string; text: string; level: number }>;
  duplicateOf?: string;
  lastAutosavedAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonical?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  seoScore?: number;
  includeInSitemap: boolean;
  includeInRss: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  permanentlyDeletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListBlogsQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  publicationStatus?: BlogPublicationStatus;
  category?: string;
  categorySlug?: string;
  tag?: string;
  tagSlug?: string;
  author?: string;
  authorSlug?: string;
  industry?: string;
  topicCluster?: string;
  isFeatured?: boolean;
  isPinned?: boolean;
  isTrending?: boolean;
  difficultyLevel?: BlogDifficultyLevel;
  includeTrash?: boolean;
  trashOnly?: boolean;
}

export interface CreateBlogDto {
  title: string;
  slug?: string;
  excerpt?: string;
  summary?: string;
  featuredImage?: BlogImageAsset;
  thumbnail?: BlogImageAsset;
  bannerImage?: BlogImageAsset;
  content?: BlogContent;
  category?: string;
  tags?: string[];
  topicCluster?: string;
  industry?: string;
  author: string;
  difficultyLevel?: BlogDifficultyLevel;
  publicationStatus?: BlogPublicationStatus;
  scheduledPublishAt?: string;
  isFeatured?: boolean;
  isPinned?: boolean;
  isTrending?: boolean;
  allowComments?: boolean;
  tableOfContents?: Array<{ id: string; text: string; level: number }>;
  metaTitle?: string;
  metaDescription?: string;
  canonical?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  seoScore?: number;
  includeInSitemap?: boolean;
  includeInRss?: boolean;
}

export type UpdateBlogDto = Partial<CreateBlogDto>;

export interface ScheduleBlogDto {
  scheduledPublishAt: string;
}

export interface AutosaveBlogDto {
  title?: string;
  excerpt?: string;
  summary?: string;
  content?: BlogContent;
  featuredImage?: BlogImageAsset;
  thumbnail?: BlogImageAsset;
  bannerImage?: BlogImageAsset;
  category?: string;
  tags?: string[];
  topicCluster?: string;
  industry?: string;
  author?: string;
  seo?: Record<string, unknown>;
}

export type BlogBulkAction = 'delete' | 'publish' | 'archive' | 'restore';

export interface BlogBulkActionDto {
  ids: string[];
  action: BlogBulkAction;
}

export interface BlogSitemapEntry {
  slug: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface BlogRssEntry {
  slug: string;
  title: string;
  description: string;
  authorName: string;
  categoryName?: string;
  publishedAt?: string;
  updatedAt: string;
  imageUrl?: string;
}

export interface BlogPublicFeedsResponse {
  sitemap: BlogSitemapEntry[];
  rss: BlogRssEntry[];
}
