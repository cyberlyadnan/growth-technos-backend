import { CmsPublicationStatus, ServiceKind } from '@core/constants/cms';

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
  kind: ServiceKind;
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
  projectType: string;
}

export interface ImageAsset {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface ServiceResponse {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  fullDescription?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: ImageAsset;
  bannerImage?: ImageAsset;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
  kind: ServiceKind;
  categorySlug?: string;
  categoryTitle?: string;
  parentService?: ServiceRef;
  industries: TaxonomyRef[];
  primaryIndustry?: TaxonomyRef;
  technologyStack: Array<{ name: string; level?: number; logo?: string }>;
  features: Array<{ title: string; description: string; icon?: string; iconImage?: string }>;
  benefits: string[];
  process: Array<{ title: string; description?: string; order?: number }>;
  pricing?: { starting?: string; timeline?: string; included: string[]; note?: string };
  showPricing: boolean;
  deliverables: string[];
  timeline?: string;
  cta?: { title?: string; description?: string; buttonLabel?: string; buttonUrl?: string };
  faqs: Array<{ question: string; answer: string }>;
  content?: { format?: string; html?: string; plainText?: string; document?: Record<string, unknown> | null };
  tableOfContents: Array<{ id: string; text: string; level: number }>;
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
  faqSchema?: Array<{ question: string; answer: string }>;
  serviceSchema?: Record<string, unknown>;
  organizationSchema?: Record<string, unknown>;
  breadcrumbSchema?: Record<string, unknown>;
  includeInSitemap: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  permanentlyDeletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListServicesQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  publicationStatus?: CmsPublicationStatus;
  kind?: ServiceKind;
  categorySlug?: string;
  parentService?: string;
  industry?: string;
  industrySlug?: string;
  isFeatured?: boolean;
  isPinned?: boolean;
  includeTrash?: boolean;
  trashOnly?: boolean;
}

export interface CreateServiceDto {
  title: string;
  slug?: string;
  shortDescription?: string;
  fullDescription?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: ImageAsset;
  bannerImage?: ImageAsset;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
  kind?: ServiceKind;
  categorySlug?: string;
  categoryTitle?: string;
  parentService?: string | null;
  industries?: string[];
  primaryIndustry?: string | null;
  technologyStack?: Array<{ name: string; level?: number; logo?: string }>;
  features?: Array<{ title: string; description: string; icon?: string; iconImage?: string }>;
  benefits?: string[];
  process?: Array<{ title: string; description?: string; order?: number }>;
  pricing?: { starting?: string; timeline?: string; included?: string[]; note?: string };
  showPricing?: boolean;
  deliverables?: string[];
  timeline?: string;
  cta?: { title?: string; description?: string; buttonLabel?: string; buttonUrl?: string };
  faqs?: Array<{ question: string; answer: string }>;
  content?: { format?: string; html?: string; plainText?: string; document?: Record<string, unknown> | null };
  tableOfContents?: Array<{ id: string; text: string; level: number }>;
  relatedServices?: string[];
  relatedBlogs?: string[];
  relatedPortfolio?: string[];
  publicationStatus?: CmsPublicationStatus;
  scheduledPublishAt?: string | null;
  isFeatured?: boolean;
  isPinned?: boolean;
  displayOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  canonical?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  seoScore?: number;
  faqSchema?: Array<{ question: string; answer: string }>;
  serviceSchema?: Record<string, unknown>;
  organizationSchema?: Record<string, unknown>;
  breadcrumbSchema?: Record<string, unknown>;
  includeInSitemap?: boolean;
  indexable?: boolean;
  robots?: string;
  openGraph?: Record<string, unknown>;
  twitterCard?: Record<string, unknown>;
  schemaJson?: Record<string, unknown>;
  breadcrumbs?: Array<{ label: string; url: string }>;
}

export type UpdateServiceDto = Partial<CreateServiceDto>;

export interface ScheduleServiceDto {
  scheduledPublishAt: string;
}

export type ServiceBulkAction = 'delete' | 'publish' | 'archive' | 'restore';

export interface ServiceBulkActionDto {
  ids: string[];
  action: ServiceBulkAction;
}

export interface ServiceSitemapEntry {
  slug: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ServicePublicFeedsResponse {
  sitemap: ServiceSitemapEntry[];
}
