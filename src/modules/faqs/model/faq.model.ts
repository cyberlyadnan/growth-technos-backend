import { Schema, model, Document, Types } from 'mongoose';
import {
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
} from '@core/schemas/base.schema';

export interface IFaq extends Document {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  featured: boolean;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<IFaq>(
  {
    question: { type: String, required: true, trim: true, maxlength: 300 },
    answer: { type: String, required: true, trim: true, maxlength: 5000 },
    category: { type: String, required: true, trim: true, maxlength: 80, default: 'General', index: true },
    sortOrder: { type: Number, default: 0, index: true },
    featured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

applySoftDeleteQuery(faqSchema);

faqSchema.index({ question: 'text', answer: 'text', category: 'text' });
faqSchema.index({ isActive: 1, featured: 1, sortOrder: 1 });
faqSchema.index({ category: 1, sortOrder: 1 });

export const Faq = model<IFaq>('Faq', faqSchema);
