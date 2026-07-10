import { Schema } from 'mongoose';

export interface IArticleSeoFields {
  metaKeywords?: string[];
  canonicalUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  seoScore?: number;
  faqSchema?: Array<{ question: string; answer: string }>;
  articleSchema?: Record<string, unknown>;
  authorSchema?: Record<string, unknown>;
  organizationSchema?: Record<string, unknown>;
  breadcrumbSchema?: Record<string, unknown>;
  includeInSitemap: boolean;
  includeInRss: boolean;
}

export const articleSeoSchemaFields = {
  metaKeywords: [{ type: String, trim: true }],
  canonicalUrl: { type: String, trim: true },
  robotsIndex: { type: Boolean, default: true },
  robotsFollow: { type: Boolean, default: true },
  seoScore: { type: Number, min: 0, max: 100, default: 0 },
  faqSchema: [
    {
      question: { type: String, required: true, trim: true },
      answer: { type: String, required: true, trim: true },
    },
  ],
  articleSchema: { type: Schema.Types.Mixed, default: null },
  authorSchema: { type: Schema.Types.Mixed, default: null },
  organizationSchema: { type: Schema.Types.Mixed, default: null },
  breadcrumbSchema: { type: Schema.Types.Mixed, default: null },
  includeInSitemap: { type: Boolean, default: true },
  includeInRss: { type: Boolean, default: true },
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
