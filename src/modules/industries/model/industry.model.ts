import { Schema, model, Document, Types } from 'mongoose';
import {
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
} from '@core/schemas/base.schema';
import {
  IIndustrySeoFields,
  industrySeoSchemaFields,
} from '@core/schemas/industry-seo.schema';

export interface IIndustry extends Document, IIndustrySeoFields {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const industrySchema = new Schema<IIndustry>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 500 },
    icon: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    ...industrySeoSchemaFields,
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

applySoftDeleteQuery(industrySchema);

industrySchema.index({ slug: 1, isDeleted: 1 }, { unique: true });

export const Industry = model<IIndustry>('Industry', industrySchema);
