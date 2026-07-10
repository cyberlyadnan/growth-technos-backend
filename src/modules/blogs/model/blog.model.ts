import { Schema, model, Document, Types } from 'mongoose';
import {
  BlogContentFormat,
  BlogDifficultyLevel,
  BlogPublicationStatus,
  MediaStorageProvider,
} from '@core/constants';
import {
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
} from '@core/schemas/base.schema';
import { seoSchemaFields, ISeoFields } from '@core/schemas/seo.schema';
import {
  articleSeoSchemaFields,
  IArticleSeoFields,
  ITableOfContentsItem,
  tableOfContentsField,
} from '@core/schemas/blog-seo.schema';

export interface IBlogContent {
  format: BlogContentFormat;
  document: Record<string, unknown>;
  html: string;
  plainText?: string;
}

export interface IBlogImageAsset {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface IBlog extends Document, ISeoFields, IArticleSeoFields {
  id: string;
  title: string;
  excerpt?: string;
  summary?: string;
  featuredImage?: IBlogImageAsset;
  thumbnail?: IBlogImageAsset;
  bannerImage?: IBlogImageAsset;
  content: IBlogContent;
  category?: Types.ObjectId;
  tags: Types.ObjectId[];
  topicCluster?: Types.ObjectId;
  industry?: Types.ObjectId;
  author: Types.ObjectId;
  readingTimeMinutes: number;
  difficultyLevel: BlogDifficultyLevel;
  publicationStatus: BlogPublicationStatus;
  publishedAt?: Date;
  scheduledPublishAt?: Date;
  unpublishedAt?: Date;
  isFeatured: boolean;
  isPinned: boolean;
  isTrending: boolean;
  allowComments: boolean;
  viewCount: number;
  likeCount: number;
  tableOfContents: ITableOfContentsItem[];
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

const imageAssetSchema = {
  url: { type: String, required: true, trim: true },
  alt: { type: String, trim: true, maxlength: 200 },
  caption: { type: String, trim: true, maxlength: 300 },
  width: { type: Number, min: 0 },
  height: { type: Number, min: 0 },
};

const blogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true, trim: true, maxlength: 220 },
    excerpt: { type: String, trim: true, maxlength: 500 },
    summary: { type: String, trim: true, maxlength: 1200 },
    featuredImage: { type: imageAssetSchema, default: null },
    thumbnail: { type: imageAssetSchema, default: null },
    bannerImage: { type: imageAssetSchema, default: null },
    content: {
      format: {
        type: String,
        enum: Object.values(BlogContentFormat),
        default: BlogContentFormat.TIPTAP,
      },
      document: { type: Schema.Types.Mixed, default: {} },
      html: { type: String, default: '' },
      plainText: { type: String, default: '' },
    },
    category: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    topicCluster: {
      type: Schema.Types.ObjectId,
      ref: 'TopicCluster',
      default: null,
      index: true,
    },
    industry: { type: Schema.Types.ObjectId, ref: 'Industry', default: null, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'Author', required: true, index: true },
    readingTimeMinutes: { type: Number, default: 1, min: 1 },
    difficultyLevel: {
      type: String,
      enum: Object.values(BlogDifficultyLevel),
      default: BlogDifficultyLevel.INTERMEDIATE,
      index: true,
    },
    publicationStatus: {
      type: String,
      enum: Object.values(BlogPublicationStatus),
      default: BlogPublicationStatus.DRAFT,
      index: true,
    },
    publishedAt: { type: Date, default: null, index: true },
    scheduledPublishAt: { type: Date, default: null, index: true },
    unpublishedAt: { type: Date, default: null },
    isFeatured: { type: Boolean, default: false, index: true },
    isPinned: { type: Boolean, default: false, index: true },
    isTrending: { type: Boolean, default: false, index: true },
    allowComments: { type: Boolean, default: true },
    viewCount: { type: Number, default: 0, min: 0 },
    likeCount: { type: Number, default: 0, min: 0 },
    tableOfContents: tableOfContentsField,
    duplicateOf: { type: Schema.Types.ObjectId, ref: 'Blog', default: null },
    lastAutosavedAt: { type: Date, default: null },
    permanentlyDeletedAt: { type: Date, default: null },
    ...seoSchemaFields,
    ...articleSeoSchemaFields,
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

applySoftDeleteQuery(blogSchema);

blogSchema.index({ slug: 1, isDeleted: 1 }, { unique: true });
blogSchema.index({ publicationStatus: 1, publishedAt: -1 });
blogSchema.index({ publicationStatus: 1, scheduledPublishAt: 1 });
blogSchema.index({ isFeatured: 1, publishedAt: -1 });
blogSchema.index({ isTrending: 1, viewCount: -1 });
blogSchema.index({ category: 1, publicationStatus: 1, publishedAt: -1 });
blogSchema.index({ author: 1, publicationStatus: 1, publishedAt: -1 });
blogSchema.index({ title: 'text', excerpt: 'text', summary: 'text', 'content.plainText': 'text' });

export const Blog = model<IBlog>('Blog', blogSchema);

export interface IBlogAutosave extends Document {
  id: string;
  blog: Types.ObjectId;
  user: Types.ObjectId;
  title?: string;
  excerpt?: string;
  summary?: string;
  content: IBlogContent;
  featuredImage?: IBlogImageAsset;
  thumbnail?: IBlogImageAsset;
  bannerImage?: IBlogImageAsset;
  category?: Types.ObjectId;
  tags: Types.ObjectId[];
  topicCluster?: Types.ObjectId;
  industry?: Types.ObjectId;
  author?: Types.ObjectId;
  seo?: Partial<ISeoFields & IArticleSeoFields>;
  createdAt: Date;
  updatedAt: Date;
}

const blogAutosaveSchema = new Schema<IBlogAutosave>(
  {
    blog: { type: Schema.Types.ObjectId, ref: 'Blog', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true, maxlength: 220 },
    excerpt: { type: String, trim: true, maxlength: 500 },
    summary: { type: String, trim: true, maxlength: 1200 },
    content: {
      format: {
        type: String,
        enum: Object.values(BlogContentFormat),
        default: BlogContentFormat.TIPTAP,
      },
      document: { type: Schema.Types.Mixed, default: {} },
      html: { type: String, default: '' },
      plainText: { type: String, default: '' },
    },
    featuredImage: { type: imageAssetSchema, default: null },
    thumbnail: { type: imageAssetSchema, default: null },
    bannerImage: { type: imageAssetSchema, default: null },
    category: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    topicCluster: { type: Schema.Types.ObjectId, ref: 'TopicCluster', default: null },
    industry: { type: Schema.Types.ObjectId, ref: 'Industry', default: null },
    author: { type: Schema.Types.ObjectId, ref: 'Author', default: null },
    seo: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

blogAutosaveSchema.index({ blog: 1, user: 1 }, { unique: true });

export const BlogAutosave = model<IBlogAutosave>('BlogAutosave', blogAutosaveSchema);

export interface IBlogRevision extends Document {
  id: string;
  blog: Types.ObjectId;
  version: number;
  snapshot: Record<string, unknown>;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const blogRevisionSchema = new Schema<IBlogRevision>(
  {
    blog: { type: Schema.Types.ObjectId, ref: 'Blog', required: true, index: true },
    version: { type: Number, required: true, min: 1 },
    snapshot: { type: Schema.Types.Mixed, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

blogRevisionSchema.index({ blog: 1, version: -1 }, { unique: true });

export const BlogRevision = model<IBlogRevision>('BlogRevision', blogRevisionSchema);

export interface IBlogMedia extends Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageProvider: MediaStorageProvider;
  path: string;
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  thumbnails?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  blog?: Types.ObjectId;
  folder: string;
  isDeleted: boolean;
  deletedAt?: Date;
  uploadedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const blogMediaSchema = new Schema<IBlogMedia>(
  {
    filename: { type: String, required: true, trim: true },
    originalName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
    storageProvider: {
      type: String,
      enum: Object.values(MediaStorageProvider),
      default: MediaStorageProvider.LOCAL,
      index: true,
    },
    path: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, maxlength: 200 },
    caption: { type: String, trim: true, maxlength: 300 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    thumbnails: {
      small: { type: String, trim: true },
      medium: { type: String, trim: true },
      large: { type: String, trim: true },
    },
    blog: { type: Schema.Types.ObjectId, ref: 'Blog', default: null, index: true },
    folder: { type: String, default: 'blogs', trim: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

blogMediaSchema.index({ folder: 1, isDeleted: 1, createdAt: -1 });

export const BlogMedia = model<IBlogMedia>('BlogMedia', blogMediaSchema);
