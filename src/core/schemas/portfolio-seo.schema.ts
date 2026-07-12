import { Schema } from 'mongoose';

export interface IPortfolioSeoFields {
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
}

export const portfolioSeoSchemaFields = {
  metaKeywords: [{ type: String, trim: true }],
  canonicalUrl: { type: String, trim: true },
  robotsIndex: { type: Boolean, default: true },
  robotsFollow: { type: Boolean, default: true },
  seoScore: { type: Number, min: 0, max: 100, default: 0 },
  creativeWorkSchema: { type: Schema.Types.Mixed, default: null },
  organizationSchema: { type: Schema.Types.Mixed, default: null },
  breadcrumbSchema: { type: Schema.Types.Mixed, default: null },
  imageObjectSchema: { type: Schema.Types.Mixed, default: null },
  includeInSitemap: { type: Boolean, default: true },
};
