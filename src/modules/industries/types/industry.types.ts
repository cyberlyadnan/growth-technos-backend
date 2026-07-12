import { CmsPublicationStatus, ServiceKind } from '@core/constants/cms';

export interface ServiceRef {
  id: string;
  title: string;
  slug: string;
  kind?: ServiceKind;
  icon?: string;
  shortDescription?: string;
}

export interface PortfolioRef {
  id: string;
  title: string;
  slug: string;
  projectType?: string;
  shortDescription?: string;
}

export interface BlogRef {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
}

export interface ImageAsset {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface IndustryHeroCta {
  label?: string;
  url?: string;
}

export interface IndustryHero {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  trustStatement?: string;
  primaryCta?: IndustryHeroCta | null;
  secondaryCta?: IndustryHeroCta | null;
  image?: ImageAsset | null;
  videoUrl?: string;
  badges: string[];
  stats: Array<{ label: string; value: string; description?: string }>;
}

export interface IndustryResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  fullDescription?: string;
  icon?: string;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  publicationStatus: CmsPublicationStatus;
  publishedAt?: string;
  hero?: IndustryHero | null;
  trustedBy?: {
    stats: Array<{ label: string; value: string; description?: string }>;
    logoNote?: string;
  } | null;
  problems: Array<{ title: string; description?: string; icon?: string }>;
  solutions: Array<{
    problemTitle?: string;
    title: string;
    description: string;
    result?: string;
    icon?: string;
  }>;
  benefits: Array<{ title: string; description: string; icon?: string; iconImage?: string }>;
  businessResults: Array<{ label: string; value: string; description?: string }>;
  process: Array<{ title: string; description?: string; order?: number }>;
  whyUs: Array<{ title: string; description: string; icon?: string; iconImage?: string }>;
  technology: Array<{ name: string; level?: number; logo?: string }>;
  pricing?: {
    starting?: string;
    timeline?: string;
    included: string[];
    note?: string;
  } | null;
  faqs: Array<{ question: string; answer: string }>;
  resources: Array<{ title: string; description?: string; href: string; type?: string }>;
  auditCta?: {
    title?: string;
    description?: string;
    buttonLabel?: string;
    buttonUrl?: string;
  } | null;
  finalCta?: {
    title?: string;
    description?: string;
    buttonLabel?: string;
    buttonUrl?: string;
  } | null;
  bannerImage?: ImageAsset | null;
  gallery: Array<{ url: string; alt?: string; caption?: string; order?: number }>;
  content?: {
    format?: string;
    html?: string;
    plainText?: string;
    document?: Record<string, unknown> | null;
  } | null;
  testimonials: Array<{
    author: string;
    position?: string;
    text: string;
    avatar?: string;
    company?: string;
    videoUrl?: string;
  }>;
  relatedServices: ServiceRef[];
  relatedPortfolio: PortfolioRef[];
  relatedBlogs: BlogRef[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  seoScore?: number;
  includeInSitemap: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  faqSchema: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IndustrySitemapEntry {
  slug: string;
  updatedAt: string;
}

export interface IndustryPublicFeedsResponse {
  sitemap: IndustrySitemapEntry[];
}

export interface CreateIndustryDto {
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  fullDescription?: string;
  icon?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
  publicationStatus?: CmsPublicationStatus;
  publishedAt?: Date | null;
  hero?: IndustryHero | null;
  trustedBy?: IndustryResponse['trustedBy'];
  problems?: IndustryResponse['problems'];
  solutions?: IndustryResponse['solutions'];
  benefits?: IndustryResponse['benefits'];
  businessResults?: IndustryResponse['businessResults'];
  process?: IndustryResponse['process'];
  whyUs?: IndustryResponse['whyUs'];
  technology?: IndustryResponse['technology'];
  pricing?: IndustryResponse['pricing'];
  faqs?: IndustryResponse['faqs'];
  resources?: IndustryResponse['resources'];
  auditCta?: IndustryResponse['auditCta'];
  finalCta?: IndustryResponse['finalCta'];
  bannerImage?: ImageAsset | null;
  gallery?: IndustryResponse['gallery'];
  content?: IndustryResponse['content'];
  testimonials?: IndustryResponse['testimonials'];
  relatedServices?: string[];
  relatedPortfolio?: string[];
  relatedBlogs?: string[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  includeInSitemap?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  faqSchema?: boolean;
}

export type UpdateIndustryDto = Partial<CreateIndustryDto>;
