import { Schema } from 'mongoose';

export interface ISeoFields {
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
  canonical?: string;
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
    url?: string;
  };
  twitterCard?: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
  };
  schemaJson?: Record<string, unknown>;
  robots?: string;
  indexable: boolean;
  breadcrumbs?: Array<{ label: string; url: string }>;
}

export const seoSchemaFields = {
  slug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  metaTitle: { type: String, trim: true, maxlength: 70 },
  metaDescription: { type: String, trim: true, maxlength: 160 },
  canonical: { type: String, trim: true },
  openGraph: {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
    type: { type: String, default: 'website' },
    url: { type: String, trim: true },
  },
  twitterCard: {
    card: { type: String, default: 'summary_large_image' },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
  },
  schemaJson: { type: Schema.Types.Mixed, default: null },
  robots: { type: String, default: 'index, follow' },
  indexable: { type: Boolean, default: true },
  breadcrumbs: [
    {
      label: { type: String, required: true },
      url: { type: String, required: true },
    },
  ],
};
