import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';
import type { CurrencyCode } from '@core/utils/money';
import { DEFAULT_AGENCY_CURRENCY } from '@core/utils/money';
import type { TaxMode } from '../service/quotation-calc';

export interface IQuotationTemplateLine {
  description: string;
  quantity: number;
  unitPriceMinor: number;
  discountPercent?: number;
  unit?: string;
  catalogItemId?: Types.ObjectId | null;
  serviceId?: Types.ObjectId | null;
}

export interface IQuotationTemplate extends Document {
  id: string;
  name: string;
  description?: string;
  titleDefault?: string;
  currency: CurrencyCode;
  taxConfig: {
    mode: TaxMode;
    rates: Array<{ name: string; percent: number }>;
  };
  lineItems: IQuotationTemplateLine[];
  scopeOfWork?: string;
  exclusions?: string;
  assumptions?: string;
  deliveryTimeline?: string;
  paymentMilestones?: string;
  terms?: string;
  validityDays: number;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const templateLineSchema = new Schema<IQuotationTemplateLine>(
  {
    description: { type: String, required: true, trim: true, maxlength: 500 },
    quantity: { type: Number, required: true, min: 0.01 },
    unitPriceMinor: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },
    unit: { type: String, trim: true, maxlength: 40 },
    catalogItemId: { type: Schema.Types.ObjectId, ref: 'QuotationCatalogItem', default: null },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', default: null },
  },
  { _id: false },
);

const templateSchema = new Schema<IQuotationTemplate>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    titleDefault: { type: String, trim: true, maxlength: 240 },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'],
      default: DEFAULT_AGENCY_CURRENCY,
    },
    taxConfig: {
      mode: {
        type: String,
        enum: ['exclusive', 'inclusive', 'none'],
        default: 'exclusive',
      },
      rates: [
        {
          name: { type: String, trim: true, maxlength: 80 },
          percent: { type: Number, min: 0, max: 100 },
        },
      ],
    },
    lineItems: { type: [templateLineSchema], default: [] },
    scopeOfWork: { type: String, trim: true, maxlength: 10000 },
    exclusions: { type: String, trim: true, maxlength: 5000 },
    assumptions: { type: String, trim: true, maxlength: 5000 },
    deliveryTimeline: { type: String, trim: true, maxlength: 5000 },
    paymentMilestones: { type: String, trim: true, maxlength: 5000 },
    terms: { type: String, trim: true, maxlength: 10000 },
    validityDays: { type: Number, default: 15, min: 1, max: 365 },
    isActive: { type: Boolean, default: true, index: true },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

applySoftDeleteQuery(templateSchema);
templateSchema.index({ name: 'text', description: 'text' });

export const QuotationTemplate = model<IQuotationTemplate>(
  'QuotationTemplate',
  templateSchema,
);
