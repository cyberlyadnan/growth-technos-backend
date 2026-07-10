import { Schema, model, Document, Types } from 'mongoose';
import {
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
} from '@core/schemas/base.schema';

export interface IAuthor extends Document {
  id: string;
  name: string;
  slug: string;
  designation?: string;
  photo?: string;
  bio?: string;
  linkedIn?: string;
  twitter?: string;
  github?: string;
  website?: string;
  email?: string;
  user?: Types.ObjectId;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const authorSchema = new Schema<IAuthor>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    designation: { type: String, trim: true, maxlength: 120 },
    photo: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 2000 },
    linkedIn: { type: String, trim: true },
    twitter: { type: String, trim: true },
    github: { type: String, trim: true },
    website: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    isActive: { type: Boolean, default: true, index: true },
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

applySoftDeleteQuery(authorSchema);

authorSchema.index({ slug: 1, isDeleted: 1 }, { unique: true });
authorSchema.index({ name: 'text', bio: 'text' });

export const Author = model<IAuthor>('Author', authorSchema);
