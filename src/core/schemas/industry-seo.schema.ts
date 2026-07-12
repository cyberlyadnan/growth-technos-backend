export interface IIndustrySeoFields {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  seoScore?: number;
  includeInSitemap: boolean;
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
};
