export interface IIndustrySeoFields {
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
  /** When true, public pages may emit FAQ JSON-LD from industry.faqs */
  faqSchema: boolean;
}

export const industrySeoSchemaFields = {
  metaTitle: { type: String, trim: true, maxlength: 70 },
  metaDescription: { type: String, trim: true, maxlength: 160 },
  metaKeywords: [{ type: String, trim: true }],
  canonicalUrl: { type: String, trim: true },
  robotsIndex: { type: Boolean, default: true },
  robotsFollow: { type: Boolean, default: true },
  seoScore: { type: Number, min: 0, max: 100, default: 0 },
  includeInSitemap: { type: Boolean, default: true },
  ogTitle: { type: String, trim: true, maxlength: 120 },
  ogDescription: { type: String, trim: true, maxlength: 300 },
  ogImage: { type: String, trim: true },
  twitterTitle: { type: String, trim: true, maxlength: 120 },
  twitterDescription: { type: String, trim: true, maxlength: 300 },
  twitterImage: { type: String, trim: true },
  faqSchema: { type: Boolean, default: false },
};
