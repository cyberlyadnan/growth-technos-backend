import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';
import type { CurrencyCode } from '@core/utils/money';
import { DEFAULT_AGENCY_CURRENCY } from '@core/utils/money';

export interface IQuotationCatalogItem extends Document {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  unitPriceMinor: number;
  currency: CurrencyCode;
  serviceId?: Types.ObjectId | null;
  category?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const catalogItemSchema = new Schema<IQuotationCatalogItem>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    unit: { type: String, trim: true, maxlength: 40, default: 'unit' },
    unitPriceMinor: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'],
      default: DEFAULT_AGENCY_CURRENCY,
    },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', default: null, index: true },
    category: { type: String, trim: true, maxlength: 120, index: true },
    isActive: { type: Boolean, default: true, index: true },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

applySoftDeleteQuery(catalogItemSchema);
catalogItemSchema.index({ name: 'text', description: 'text' });
catalogItemSchema.index({ isActive: 1, category: 1 });

export const QuotationCatalogItem = model<IQuotationCatalogItem>(
  'QuotationCatalogItem',
  catalogItemSchema,
);
