import { Schema, model, Document, Types } from 'mongoose';
import { CommentStatus } from '@core/constants';
import {
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
} from '@core/schemas/base.schema';

export interface IBlogComment extends Document {
  id: string;
  blog: Types.ObjectId;
  parent?: Types.ObjectId;
  user?: Types.ObjectId;
  guestName?: string;
  guestEmail?: string;
  guestWebsite?: string;
  content: string;
  status: CommentStatus;
  likeCount: number;
  likedBy: Types.ObjectId[];
  isPinned: boolean;
  isAdminReply: boolean;
  isAuthorReply: boolean;
  isReported: boolean;
  reportCount: number;
  editedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const blogCommentSchema = new Schema<IBlogComment>(
  {
    blog: { type: Schema.Types.ObjectId, ref: 'Blog', required: true, index: true },
    parent: { type: Schema.Types.ObjectId, ref: 'BlogComment', default: null, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    guestName: { type: String, trim: true, maxlength: 120 },
    guestEmail: { type: String, trim: true, lowercase: true, maxlength: 160 },
    guestWebsite: { type: String, trim: true, maxlength: 300 },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    status: {
      type: String,
      enum: Object.values(CommentStatus),
      default: CommentStatus.PENDING,
      index: true,
    },
    likeCount: { type: Number, default: 0, min: 0 },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isPinned: { type: Boolean, default: false, index: true },
    isAdminReply: { type: Boolean, default: false },
    isAuthorReply: { type: Boolean, default: false },
    isReported: { type: Boolean, default: false, index: true },
    reportCount: { type: Number, default: 0, min: 0 },
    editedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

applySoftDeleteQuery(blogCommentSchema);

blogCommentSchema.index({ blog: 1, status: 1, createdAt: -1 });
blogCommentSchema.index({ blog: 1, parent: 1, status: 1, createdAt: 1 });
blogCommentSchema.index({ blog: 1, isPinned: -1, likeCount: -1, createdAt: -1 });

export const BlogComment = model<IBlogComment>('BlogComment', blogCommentSchema);

export interface ICommentReport extends Document {
  id: string;
  comment: Types.ObjectId;
  blog: Types.ObjectId;
  reason?: string;
  reporterEmail?: string;
  reporterIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentReportSchema = new Schema<ICommentReport>(
  {
    comment: { type: Schema.Types.ObjectId, ref: 'BlogComment', required: true, index: true },
    blog: { type: Schema.Types.ObjectId, ref: 'Blog', required: true, index: true },
    reason: { type: String, trim: true, maxlength: 500 },
    reporterEmail: { type: String, trim: true, lowercase: true },
    reporterIp: { type: String, trim: true },
  },
  { timestamps: true },
);

commentReportSchema.index({ comment: 1, createdAt: -1 });

export const CommentReport = model<ICommentReport>('CommentReport', commentReportSchema);
