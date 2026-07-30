import { Schema, model, Document, Types } from 'mongoose';
import {
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
} from '@core/schemas/base.schema';

export interface ITestimonial extends Document {
  id: string;
  name: string;
  role?: string;
  company?: string;
  content: string;
  avatar?: string;
  rating: number;
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

const testimonialSchema = new Schema<ITestimonial>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, trim: true, maxlength: 160 },
    company: { type: String, trim: true, maxlength: 160 },
    content: { type: String, required: true, trim: true, maxlength: 3000 },
    avatar: { type: String, trim: true },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    sortOrder: { type: Number, default: 0, index: true },
    featured: { type: Boolean, default: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

applySoftDeleteQuery(testimonialSchema);

testimonialSchema.index({ name: 'text', content: 'text', company: 'text', role: 'text' });
testimonialSchema.index({ isActive: 1, featured: 1, sortOrder: 1 });

export const Testimonial = model<ITestimonial>('Testimonial', testimonialSchema);
