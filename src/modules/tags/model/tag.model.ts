import { Schema, model, Document, Types } from 'mongoose';
import {
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
} from '@core/schemas/base.schema';

export interface ITag extends Document {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const tagSchema = new Schema<ITag>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 300 },
    color: { type: String, trim: true, maxlength: 20 },
    isActive: { type: Boolean, default: true, index: true },
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

applySoftDeleteQuery(tagSchema);

tagSchema.index({ slug: 1, isDeleted: 1 }, { unique: true });
tagSchema.index({ name: 'text' });

export const Tag = model<ITag>('Tag', tagSchema);
