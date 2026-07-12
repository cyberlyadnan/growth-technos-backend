import { Schema, model, Document, Types } from 'mongoose';
import { CmsPublicationStatus, ServiceKind } from '@core/constants/cms';
import {
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
} from '@core/schemas/base.schema';
import { seoSchemaFields, ISeoFields } from '@core/schemas/seo.schema';
import {
  IServiceSeoFields,
  serviceSeoSchemaFields,
} from '@core/schemas/service-seo.schema';
import {
  ctaBlockSchema,
  faqItemSchema,
  featureItemSchema,
  ICtaBlock,
  IFaqItem,
  IFeatureItem,
  IImageAsset,
  IPricingInfo,
  IProcessStep,
  IRichContent,
  ITechnologyItem,
  ITableOfContentsItem,
  imageAssetSchema,
  pricingInfoSchema,
  processStepSchema,
  richContentSchema,
  technologyItemSchema,
  tableOfContentsField,
} from '@core/schemas/content.schema';

export interface IService extends Document, ISeoFields, IServiceSeoFields {
  id: string;
  title: string;
  shortDescription?: string;
  fullDescription?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: IImageAsset;
  bannerImage?: IImageAsset;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
  kind: ServiceKind;
  categorySlug?: string;
  categoryTitle?: string;
  parentService?: Types.ObjectId;
  industries: Types.ObjectId[];
  primaryIndustry?: Types.ObjectId;
  technologyStack: ITechnologyItem[];
  features: IFeatureItem[];
  benefits: string[];
  process: IProcessStep[];
  pricing?: IPricingInfo;
  deliverables: string[];
  timeline?: string;
  cta?: ICtaBlock;
  faqs: IFaqItem[];
  content?: IRichContent;
  tableOfContents: ITableOfContentsItem[];
  relatedServices: Types.ObjectId[];
  relatedBlogs: Types.ObjectId[];
  relatedPortfolio: Types.ObjectId[];
  publicationStatus: CmsPublicationStatus;
  publishedAt?: Date;
  scheduledPublishAt?: Date;
  unpublishedAt?: Date;
  isFeatured: boolean;
  isPinned: boolean;
  displayOrder: number;
  viewCount: number;
  duplicateOf?: Types.ObjectId;
  lastAutosavedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  permanentlyDeletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    title: { type: String, required: true, trim: true, maxlength: 220 },
    shortDescription: { type: String, trim: true, maxlength: 500 },
    fullDescription: { type: String, trim: true, maxlength: 10000 },
    heroTitle: { type: String, trim: true, maxlength: 220 },
    heroSubtitle: { type: String, trim: true, maxlength: 500 },
    heroImage: { type: imageAssetSchema, default: null },
    bannerImage: { type: imageAssetSchema, default: null },
    icon: { type: String, trim: true, maxlength: 80 },
    iconBg: { type: String, trim: true, maxlength: 120 },
    iconColor: { type: String, trim: true, maxlength: 120 },
    kind: {
      type: String,
      enum: Object.values(ServiceKind),
      default: ServiceKind.CATEGORY,
      index: true,
    },
    categorySlug: { type: String, trim: true, lowercase: true, index: true },
    categoryTitle: { type: String, trim: true, maxlength: 160 },
    parentService: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      default: null,
      index: true,
    },
    industries: [{ type: Schema.Types.ObjectId, ref: 'Industry' }],
    primaryIndustry: {
      type: Schema.Types.ObjectId,
      ref: 'Industry',
      default: null,
      index: true,
    },
    technologyStack: [technologyItemSchema],
    features: [featureItemSchema],
    benefits: [{ type: String, trim: true }],
    process: [processStepSchema],
    pricing: { type: pricingInfoSchema, default: null },
    deliverables: [{ type: String, trim: true }],
    timeline: { type: String, trim: true, maxlength: 200 },
    cta: { type: ctaBlockSchema, default: null },
    faqs: [faqItemSchema],
    content: { type: richContentSchema, default: null },
    tableOfContents: tableOfContentsField,
    relatedServices: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
    relatedBlogs: [{ type: Schema.Types.ObjectId, ref: 'Blog' }],
    relatedPortfolio: [{ type: Schema.Types.ObjectId, ref: 'PortfolioProject' }],
    publicationStatus: {
      type: String,
      enum: Object.values(CmsPublicationStatus),
      default: CmsPublicationStatus.DRAFT,
      index: true,
    },
    publishedAt: { type: Date, default: null, index: true },
    scheduledPublishAt: { type: Date, default: null },
    unpublishedAt: { type: Date, default: null },
    isFeatured: { type: Boolean, default: false, index: true },
    isPinned: { type: Boolean, default: false, index: true },
    displayOrder: { type: Number, default: 0, index: true },
    viewCount: { type: Number, default: 0, min: 0 },
    duplicateOf: { type: Schema.Types.ObjectId, ref: 'Service', default: null },
    lastAutosavedAt: { type: Date, default: null },
    permanentlyDeletedAt: { type: Date, default: null },
    ...seoSchemaFields,
    ...serviceSeoSchemaFields,
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

applySoftDeleteQuery(serviceSchema);

serviceSchema.index({ slug: 1, isDeleted: 1 }, { unique: true });
serviceSchema.index({ publicationStatus: 1, isFeatured: 1, displayOrder: 1 });
serviceSchema.index({ publicationStatus: 1, isDeleted: 1, industries: 1, displayOrder: 1 });
serviceSchema.index({ kind: 1, categorySlug: 1, displayOrder: 1 });
serviceSchema.index({ title: 'text', shortDescription: 'text', fullDescription: 'text' });

export const Service = model<IService>('Service', serviceSchema);
