import { Schema, model, Document, Types } from 'mongoose';
import { CmsPublicationStatus, PortfolioProjectType } from '@core/constants/cms';
import {
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
} from '@core/schemas/base.schema';
import { seoSchemaFields, ISeoFields } from '@core/schemas/seo.schema';
import {
  IPortfolioSeoFields,
  portfolioSeoSchemaFields,
} from '@core/schemas/portfolio-seo.schema';
import {
  externalLinksSchema,
  galleryItemSchema,
  IExternalLinks,
  IGalleryItem,
  IImageAsset,
  IProcessStep,
  IRichContent,
  IStatisticItem,
  ITestimonial,
  ITechnologyItem,
  ITableOfContentsItem,
  imageAssetSchema,
  processStepSchema,
  richContentSchema,
  statisticItemSchema,
  technologyItemSchema,
  testimonialSchema,
  tableOfContentsField,
} from '@core/schemas/content.schema';

export interface IPortfolioProject extends Document, ISeoFields, IPortfolioSeoFields {
  id: string;
  title: string;
  clientName?: string;
  industryLabel?: string;
  category?: string;
  shortDescription?: string;
  fullDescription?: string;
  challenge?: string;
  solution?: string;
  process: IProcessStep[];
  technologyStack: ITechnologyItem[];
  projectDuration?: string;
  servicesUsed: string[];
  features: string[];
  businessResults: string[];
  statistics: IStatisticItem[];
  testimonial?: ITestimonial;
  gallery: IGalleryItem[];
  featuredImage?: IImageAsset;
  bannerImage?: IImageAsset;
  links: IExternalLinks;
  content?: IRichContent;
  tableOfContents: ITableOfContentsItem[];
  projectType: PortfolioProjectType;
  industries: Types.ObjectId[];
  primaryIndustry?: Types.ObjectId;
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
  completionDate?: string;
  teamSize?: string;
  budget?: string;
  legacyId?: string;
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

const portfolioProjectSchema = new Schema<IPortfolioProject>(
  {
    title: { type: String, required: true, trim: true, maxlength: 220 },
    clientName: { type: String, trim: true, maxlength: 160 },
    industryLabel: { type: String, trim: true, maxlength: 120 },
    category: { type: String, trim: true, maxlength: 120, index: true },
    shortDescription: { type: String, trim: true, maxlength: 500 },
    fullDescription: { type: String, trim: true, maxlength: 15000 },
    challenge: { type: String, trim: true, maxlength: 8000 },
    solution: { type: String, trim: true, maxlength: 8000 },
    process: [processStepSchema],
    technologyStack: [technologyItemSchema],
    projectDuration: { type: String, trim: true, maxlength: 120 },
    servicesUsed: [{ type: String, trim: true }],
    features: [{ type: String, trim: true }],
    businessResults: [{ type: String, trim: true }],
    statistics: [statisticItemSchema],
    testimonial: { type: testimonialSchema, default: null },
    gallery: [galleryItemSchema],
    featuredImage: { type: imageAssetSchema, default: null },
    bannerImage: { type: imageAssetSchema, default: null },
    links: { type: externalLinksSchema, default: () => ({}) },
    content: { type: richContentSchema, default: null },
    tableOfContents: tableOfContentsField,
    projectType: {
      type: String,
      enum: Object.values(PortfolioProjectType),
      default: PortfolioProjectType.CASE_STUDY,
      index: true,
    },
    industries: [{ type: Schema.Types.ObjectId, ref: 'Industry' }],
    primaryIndustry: {
      type: Schema.Types.ObjectId,
      ref: 'Industry',
      default: null,
      index: true,
    },
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
    completionDate: { type: String, trim: true, maxlength: 40 },
    teamSize: { type: String, trim: true, maxlength: 80 },
    budget: { type: String, trim: true, maxlength: 80 },
    legacyId: { type: String, trim: true, index: true },
    duplicateOf: { type: Schema.Types.ObjectId, ref: 'PortfolioProject', default: null },
    lastAutosavedAt: { type: Date, default: null },
    permanentlyDeletedAt: { type: Date, default: null },
    ...seoSchemaFields,
    ...portfolioSeoSchemaFields,
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

applySoftDeleteQuery(portfolioProjectSchema);

portfolioProjectSchema.index({ slug: 1, isDeleted: 1 }, { unique: true });
portfolioProjectSchema.index({ publicationStatus: 1, projectType: 1, displayOrder: 1 });
portfolioProjectSchema.index({
  publicationStatus: 1,
  isDeleted: 1,
  projectType: 1,
  industries: 1,
  displayOrder: 1,
});
portfolioProjectSchema.index({ isFeatured: 1, isPinned: 1, publishedAt: -1 });
portfolioProjectSchema.index({
  title: 'text',
  shortDescription: 'text',
  fullDescription: 'text',
  clientName: 'text',
  category: 'text',
});

export const PortfolioProject = model<IPortfolioProject>(
  'PortfolioProject',
  portfolioProjectSchema,
);
