import { Schema, model, Document, Types } from 'mongoose';
import { CmsPublicationStatus } from '@core/constants/cms';
import {
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
} from '@core/schemas/base.schema';
import {
  IIndustrySeoFields,
  industrySeoSchemaFields,
} from '@core/schemas/industry-seo.schema';
import {
  ctaBlockSchema,
  faqItemSchema,
  featureItemSchema,
  galleryItemSchema,
  ICtaBlock,
  IFaqItem,
  IFeatureItem,
  IGalleryItem,
  IImageAsset,
  IPricingInfo,
  IProcessStep,
  IRichContent,
  IStatisticItem,
  ITechnologyItem,
  ITestimonial,
  imageAssetSchema,
  pricingInfoSchema,
  processStepSchema,
  richContentSchema,
  statisticItemSchema,
  technologyItemSchema,
} from '@core/schemas/content.schema';

export interface IIndustryHeroCta {
  label?: string;
  url?: string;
}

export interface IIndustryHero {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  trustStatement?: string;
  primaryCta?: IIndustryHeroCta | null;
  secondaryCta?: IIndustryHeroCta | null;
  image?: IImageAsset | null;
  videoUrl?: string;
  badges: string[];
  stats: IStatisticItem[];
}

export interface IIndustryTrustedBy {
  stats: IStatisticItem[];
  logoNote?: string;
}

export interface IIndustryProblem {
  title: string;
  description?: string;
  icon?: string;
}

export interface IIndustrySolution {
  problemTitle?: string;
  title: string;
  description: string;
  result?: string;
  icon?: string;
}

export interface IIndustryResource {
  title: string;
  description?: string;
  href: string;
  type?: string;
}

export interface IIndustryTestimonial extends ITestimonial {
  videoUrl?: string;
}

export interface IIndustry extends Document, IIndustrySeoFields {
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
  publishedAt?: Date;
  hero?: IIndustryHero | null;
  trustedBy?: IIndustryTrustedBy | null;
  problems: IIndustryProblem[];
  solutions: IIndustrySolution[];
  benefits: IFeatureItem[];
  businessResults: IStatisticItem[];
  process: IProcessStep[];
  whyUs: IFeatureItem[];
  technology: ITechnologyItem[];
  pricing?: IPricingInfo | null;
  faqs: IFaqItem[];
  resources: IIndustryResource[];
  auditCta?: ICtaBlock | null;
  finalCta?: ICtaBlock | null;
  bannerImage?: IImageAsset | null;
  gallery: IGalleryItem[];
  content?: IRichContent | null;
  testimonials: IIndustryTestimonial[];
  relatedServices: Types.ObjectId[];
  relatedPortfolio: Types.ObjectId[];
  relatedBlogs: Types.ObjectId[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const industryHeroCtaSchema = {
  label: { type: String, trim: true, maxlength: 80 },
  url: { type: String, trim: true },
};

const industryHeroSchema = {
  eyebrow: { type: String, trim: true, maxlength: 80 },
  title: { type: String, trim: true, maxlength: 220 },
  subtitle: { type: String, trim: true, maxlength: 500 },
  trustStatement: { type: String, trim: true, maxlength: 300 },
  primaryCta: { type: industryHeroCtaSchema, default: null },
  secondaryCta: { type: industryHeroCtaSchema, default: null },
  image: { type: imageAssetSchema, default: null },
  videoUrl: { type: String, trim: true },
  badges: [{ type: String, trim: true }],
  stats: [statisticItemSchema],
};

const industryTrustedBySchema = {
  stats: [statisticItemSchema],
  logoNote: { type: String, trim: true, maxlength: 300 },
};

const industryProblemSchema = {
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 2000 },
  icon: { type: String, trim: true },
};

const industrySolutionSchema = {
  problemTitle: { type: String, trim: true, maxlength: 160 },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  result: { type: String, trim: true, maxlength: 500 },
  icon: { type: String, trim: true },
};

const industryResourceSchema = {
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 500 },
  href: { type: String, required: true, trim: true },
  type: { type: String, trim: true, maxlength: 80 },
};

const industryTestimonialSchema = {
  author: { type: String, required: true, trim: true, maxlength: 120 },
  position: { type: String, trim: true, maxlength: 160 },
  text: { type: String, required: true, trim: true, maxlength: 3000 },
  avatar: { type: String, trim: true },
  company: { type: String, trim: true, maxlength: 160 },
  videoUrl: { type: String, trim: true },
};

const industrySchema = new Schema<IIndustry>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 2000 },
    shortDescription: { type: String, trim: true, maxlength: 500 },
    fullDescription: { type: String, trim: true, maxlength: 10000 },
    icon: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    displayOrder: { type: Number, default: 0, index: true },
    publicationStatus: {
      type: String,
      enum: Object.values(CmsPublicationStatus),
      default: CmsPublicationStatus.DRAFT,
      index: true,
    },
    publishedAt: { type: Date, default: null, index: true },
    hero: { type: industryHeroSchema, default: null },
    trustedBy: { type: industryTrustedBySchema, default: null },
    problems: [industryProblemSchema],
    solutions: [industrySolutionSchema],
    benefits: [featureItemSchema],
    businessResults: [statisticItemSchema],
    process: [processStepSchema],
    whyUs: [featureItemSchema],
    technology: [technologyItemSchema],
    pricing: { type: pricingInfoSchema, default: null },
    faqs: [faqItemSchema],
    resources: [industryResourceSchema],
    auditCta: { type: ctaBlockSchema, default: null },
    finalCta: { type: ctaBlockSchema, default: null },
    bannerImage: { type: imageAssetSchema, default: null },
    gallery: [galleryItemSchema],
    content: { type: richContentSchema, default: null },
    testimonials: [industryTestimonialSchema],
    relatedServices: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
    relatedPortfolio: [{ type: Schema.Types.ObjectId, ref: 'PortfolioProject' }],
    relatedBlogs: [{ type: Schema.Types.ObjectId, ref: 'Blog' }],
    ...industrySeoSchemaFields,
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

applySoftDeleteQuery(industrySchema);

industrySchema.index({ slug: 1, isDeleted: 1 }, { unique: true });
industrySchema.index({ publicationStatus: 1, isActive: 1, displayOrder: 1 });
industrySchema.index({ publicationStatus: 1, isFeatured: 1, displayOrder: 1 });
industrySchema.index({ name: 'text', shortDescription: 'text', description: 'text' });

export const Industry = model<IIndustry>('Industry', industrySchema);
