import { Schema } from 'mongoose';

export interface IServiceSeoFields {
  metaKeywords?: string[];
  canonicalUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  seoScore?: number;
  serviceSchema?: Record<string, unknown>;
  organizationSchema?: Record<string, unknown>;
  breadcrumbSchema?: Record<string, unknown>;
  faqSchema?: Array<{ question: string; answer: string }>;
  includeInSitemap: boolean;
}

export const serviceSeoSchemaFields = {
  metaKeywords: [{ type: String, trim: true }],
  canonicalUrl: { type: String, trim: true },
  robotsIndex: { type: Boolean, default: true },
  robotsFollow: { type: Boolean, default: true },
  seoScore: { type: Number, min: 0, max: 100, default: 0 },
  serviceSchema: { type: Schema.Types.Mixed, default: null },
  organizationSchema: { type: Schema.Types.Mixed, default: null },
  breadcrumbSchema: { type: Schema.Types.Mixed, default: null },
  faqSchema: [
    {
      question: { type: String, required: true, trim: true },
      answer: { type: String, required: true, trim: true },
    },
  ],
  includeInSitemap: { type: Boolean, default: true },
};
