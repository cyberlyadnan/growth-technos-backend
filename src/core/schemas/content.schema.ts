import { Schema } from 'mongoose';

export interface IImageAsset {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface IFeatureItem {
  title: string;
  description: string;
  icon?: string;
  iconImage?: string;
}

export interface ITechnologyItem {
  name: string;
  level?: number;
  logo?: string;
}

export interface IFaqItem {
  question: string;
  answer: string;
}

export interface IPricingInfo {
  starting?: string;
  timeline?: string;
  included: string[];
  note?: string;
}

export interface ICtaBlock {
  title?: string;
  description?: string;
  buttonLabel?: string;
  buttonUrl?: string;
}

export interface IProcessStep {
  title: string;
  description?: string;
  order?: number;
}

export interface ITestimonial {
  author: string;
  position?: string;
  text: string;
  avatar?: string;
  company?: string;
}

export interface IStatisticItem {
  label: string;
  value: string;
  description?: string;
}

export interface IGalleryItem {
  url: string;
  alt?: string;
  caption?: string;
  order?: number;
}

export interface IExternalLinks {
  websiteUrl?: string;
  playStoreUrl?: string;
  appStoreUrl?: string;
  githubUrl?: string;
}

export interface IRichContent {
  format?: string;
  html?: string;
  plainText?: string;
  document?: Record<string, unknown> | null;
}

export const imageAssetSchema = {
  url: { type: String, required: true, trim: true },
  alt: { type: String, trim: true, maxlength: 200 },
  caption: { type: String, trim: true, maxlength: 300 },
  width: { type: Number, min: 0 },
  height: { type: Number, min: 0 },
};

export const featureItemSchema = {
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  icon: { type: String, trim: true },
  iconImage: { type: String, trim: true },
};

export const technologyItemSchema = {
  name: { type: String, required: true, trim: true, maxlength: 120 },
  level: { type: Number, min: 0, max: 100 },
  logo: { type: String, trim: true },
};

export const faqItemSchema = {
  question: { type: String, required: true, trim: true, maxlength: 300 },
  answer: { type: String, required: true, trim: true, maxlength: 5000 },
};

export const pricingInfoSchema = {
  starting: { type: String, trim: true, maxlength: 120 },
  timeline: { type: String, trim: true, maxlength: 200 },
  included: [{ type: String, trim: true }],
  note: { type: String, trim: true, maxlength: 500 },
};

export const ctaBlockSchema = {
  title: { type: String, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 500 },
  buttonLabel: { type: String, trim: true, maxlength: 80 },
  buttonUrl: { type: String, trim: true },
};

export const processStepSchema = {
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 2000 },
  order: { type: Number, min: 0, default: 0 },
};

export const testimonialSchema = {
  author: { type: String, required: true, trim: true, maxlength: 120 },
  position: { type: String, trim: true, maxlength: 160 },
  text: { type: String, required: true, trim: true, maxlength: 3000 },
  avatar: { type: String, trim: true },
  company: { type: String, trim: true, maxlength: 160 },
};

export const statisticItemSchema = {
  label: { type: String, required: true, trim: true, maxlength: 120 },
  value: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 300 },
};

export const galleryItemSchema = {
  url: { type: String, required: true, trim: true },
  alt: { type: String, trim: true, maxlength: 200 },
  caption: { type: String, trim: true, maxlength: 300 },
  order: { type: Number, min: 0, default: 0 },
};

export const externalLinksSchema = {
  websiteUrl: { type: String, trim: true },
  playStoreUrl: { type: String, trim: true },
  appStoreUrl: { type: String, trim: true },
  githubUrl: { type: String, trim: true },
};

export const richContentSchema = {
  format: { type: String, default: 'html' },
  html: { type: String, default: '' },
  plainText: { type: String, default: '' },
  document: { type: Schema.Types.Mixed, default: null },
};

export interface ITableOfContentsItem {
  id: string;
  text: string;
  level: number;
}

export const tableOfContentsField = [
  {
    id: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    level: { type: Number, required: true, min: 1, max: 6 },
  },
];
