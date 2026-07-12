import { CmsPublicationStatus } from '@core/constants/cms';

export type IndustryPageSeed = {
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  fullDescription: string;
  icon: string;
  isFeatured: boolean;
  displayOrder: number;
  publicationStatus: CmsPublicationStatus;
  focusKeyword: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  faqSchema: boolean;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    trustStatement: string;
    primaryCta: { label: string; url: string };
    secondaryCta: { label: string; url: string };
    image: { url: string; alt: string };
    badges: string[];
    stats: Array<{ label: string; value: string; description?: string }>;
  };
  bannerImage: { url: string; alt: string };
  gallery: Array<{ url: string; alt: string; caption?: string; order: number }>;
  trustedBy: {
    stats: Array<{ label: string; value: string; description?: string }>;
    logoNote: string;
  };
  problems: Array<{ title: string; description: string; icon?: string }>;
  solutions: Array<{
    problemTitle: string;
    title: string;
    description: string;
    result: string;
    icon?: string;
  }>;
  benefits: Array<{ title: string; description: string; icon?: string }>;
  businessResults: Array<{ label: string; value: string; description?: string }>;
  process: Array<{ title: string; description: string; order: number }>;
  whyUs: Array<{ title: string; description: string; icon?: string }>;
  technology: Array<{ name: string; level?: number }>;
  pricing: {
    starting: string;
    timeline: string;
    included: string[];
    note: string;
  };
  faqs: Array<{ question: string; answer: string }>;
  resources: Array<{ title: string; description: string; href: string; type: string }>;
  auditCta: {
    title: string;
    description: string;
    buttonLabel: string;
    buttonUrl: string;
  };
  finalCta: {
    title: string;
    description: string;
    buttonLabel: string;
    buttonUrl: string;
  };
  testimonials: Array<{
    author: string;
    position: string;
    company: string;
    text: string;
    avatar: string;
  }>;
  content: {
    format: 'html';
    html: string;
    plainText: string;
  };
  /** Service slugs to attach (category or specialty). Missing stubs are created by the seeder. */
  relatedServiceSlugs: string[];
  relatedPortfolioSlugs: string[];
  relatedBlogSlugs: string[];
};

export type IndustryStubService = {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  kind?: 'category' | 'specialty';
  categorySlug?: string;
};
