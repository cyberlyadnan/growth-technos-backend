import { CmsPublicationStatus, PortfolioProjectType } from '@core/constants/cms';

export interface TaxonomyRef {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface ServiceRef {
  id: string;
  title: string;
  slug: string;
}

export interface BlogRef {
  id: string;
  title: string;
  slug: string;
}

export interface PortfolioRef {
  id: string;
  title: string;
  slug: string;
  projectType: PortfolioProjectType;
}

export interface ImageAsset {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface PortfolioResponse {
  id: string;
  title: string;
  slug: string;
  clientName?: string;
  industryLabel?: string;
  category?: string;
  shortDescription?: string;
  fullDescription?: string;
  challenge?: string;
  solution?: string;
  process: Array<{ title: string; description?: string; order?: number }>;
  technologyStack: Array<{ name: string; level?: number; logo?: string }>;
  projectDuration?: string;
  servicesUsed: string[];
  features: string[];
  businessResults: string[];
  statistics: Array<{ label: string; value: string; description?: string }>;
  testimonial?: { author: string; position?: string; text: string; avatar?: string; company?: string };
  gallery: Array<{ url: string; alt?: string; caption?: string; order?: number }>;
  featuredImage?: ImageAsset;
  bannerImage?: ImageAsset;
  links: { websiteUrl?: string; playStoreUrl?: string; appStoreUrl?: string; githubUrl?: string };
  content?: { format?: string; html?: string; plainText?: string; document?: Record<string, unknown> | null };
  tableOfContents: Array<{ id: string; text: string; level: number }>;
  projectType: PortfolioProjectType;
  industries: TaxonomyRef[];
  primaryIndustry?: TaxonomyRef;
  relatedServices: ServiceRef[];
  relatedBlogs: BlogRef[];
  relatedPortfolio: PortfolioRef[];
  publicationStatus: CmsPublicationStatus;
  publishedAt?: string;
  scheduledPublishAt?: string;
  unpublishedAt?: string;
  isFeatured: boolean;
  isPinned: boolean;
  displayOrder: number;
  viewCount: number;
  completionDate?: string;
  teamSize?: string;
  budget?: string;
  legacyId?: string;
  duplicateOf?: string;
  lastAutosavedAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonical?: string;
  openGraph?: Record<string, unknown>;
  twitterCard?: Record<string, unknown>;
  schemaJson?: Record<string, unknown>;
  robots?: string;
  indexable: boolean;
  breadcrumbs?: Array<{ label: string; url: string }>;
  metaKeywords?: string[];
  canonicalUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  seoScore?: number;
  creativeWorkSchema?: Record<string, unknown>;
  organizationSchema?: Record<string, unknown>;
  breadcrumbSchema?: Record<string, unknown>;
  imageObjectSchema?: Record<string, unknown>;
  includeInSitemap: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  permanentlyDeletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListPortfolioQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  publicationStatus?: CmsPublicationStatus;
  projectType?: PortfolioProjectType;
  category?: string;
  industry?: string;
  industrySlug?: string;
  isFeatured?: boolean;
  isPinned?: boolean;
  includeTrash?: boolean;
  trashOnly?: boolean;
}

export interface CreatePortfolioDto {
  title: string;
  slug?: string;
  clientName?: string;
  industryLabel?: string;
  category?: string;
  shortDescription?: string;
  fullDescription?: string;
  challenge?: string;
  solution?: string;
  process?: Array<{ title: string; description?: string; order?: number }>;
  technologyStack?: Array<{ name: string; level?: number; logo?: string }>;
  projectDuration?: string;
  servicesUsed?: string[];
  features?: string[];
  businessResults?: string[];
  statistics?: Array<{ label: string; value: string; description?: string }>;
  testimonial?: { author: string; position?: string; text: string; avatar?: string; company?: string };
  gallery?: Array<{ url: string; alt?: string; caption?: string; order?: number }>;
  featuredImage?: ImageAsset;
  bannerImage?: ImageAsset;
  links?: { websiteUrl?: string; playStoreUrl?: string; appStoreUrl?: string; githubUrl?: string };
  content?: { format?: string; html?: string; plainText?: string; document?: Record<string, unknown> | null };
  tableOfContents?: Array<{ id: string; text: string; level: number }>;
  projectType?: PortfolioProjectType;
  industries?: string[];
  primaryIndustry?: string | null;
  relatedServices?: string[];
  relatedBlogs?: string[];
  relatedPortfolio?: string[];
  publicationStatus?: CmsPublicationStatus;
  scheduledPublishAt?: string | null;
  isFeatured?: boolean;
  isPinned?: boolean;
  displayOrder?: number;
  completionDate?: string;
  teamSize?: string;
  budget?: string;
  legacyId?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonical?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  seoScore?: number;
  creativeWorkSchema?: Record<string, unknown>;
  organizationSchema?: Record<string, unknown>;
  breadcrumbSchema?: Record<string, unknown>;
  imageObjectSchema?: Record<string, unknown>;
  includeInSitemap?: boolean;
  indexable?: boolean;
  robots?: string;
  openGraph?: Record<string, unknown>;
  twitterCard?: Record<string, unknown>;
  schemaJson?: Record<string, unknown>;
  breadcrumbs?: Array<{ label: string; url: string }>;
}

export type UpdatePortfolioDto = Partial<CreatePortfolioDto>;

export interface SchedulePortfolioDto {
  scheduledPublishAt: string;
}

export type PortfolioBulkAction = 'delete' | 'publish' | 'archive' | 'restore';

export interface PortfolioBulkActionDto {
  ids: string[];
  action: PortfolioBulkAction;
}

export interface PortfolioSitemapEntry {
  slug: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface PortfolioPublicFeedsResponse {
  sitemap: PortfolioSitemapEntry[];
}
