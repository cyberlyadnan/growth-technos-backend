import { Schema, model, Document, Types } from 'mongoose';
import {
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
} from '@core/schemas/base.schema';

export interface ICategory extends Document {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent?: Types.ObjectId;
  sortOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 500 },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

applySoftDeleteQuery(categorySchema);

categorySchema.index({ slug: 1, isDeleted: 1 }, { unique: true });
categorySchema.index({ parent: 1, sortOrder: 1 });

export const Category = model<ICategory>('Category', categorySchema);
