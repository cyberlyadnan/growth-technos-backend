import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';
import type { CurrencyCode } from '@core/utils/money';
import { DEFAULT_AGENCY_CURRENCY } from '@core/utils/money';
import type { TaxMode } from '../service/quotation-calc';

export type QuotationStatus =
  | 'draft'
  | 'issued'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'revised';

export interface IQuotationLine {
  key: string;
  description: string;
  quantity: number;
  unitPriceMinor: number;
  discountPercent: number;
  discountMinor: number;
  lineGrossMinor: number;
  lineDiscountTotalMinor: number;
  lineNetMinor: number;
  lineTaxMinor: number;
  lineTotalMinor: number;
  taxBreakdown: Array<{ name: string; percent: number; amountMinor: number }>;
  serviceId?: Types.ObjectId | null;
  catalogItemId?: Types.ObjectId | null;
  unit?: string;
}

export interface IQuotationTaxConfig {
  mode: TaxMode;
  rates: Array<{ name: string; percent: number }>;
}

export interface IQuotationSnapshot {
  version: number;
  code: string;
  status: QuotationStatus;
  title: string;
  issueDate?: Date;
  expiryDate?: Date;
  currency: CurrencyCode;
  taxConfig: IQuotationTaxConfig;
  lineItems: IQuotationLine[];
  subtotalMinor: number;
  discountTotalMinor: number;
  taxMinor: number;
  grandTotalMinor: number;
  taxBreakdown: Array<{ name: string; percent: number; amountMinor: number }>;
  scopeOfWork?: string;
  exclusions?: string;
  assumptions?: string;
  deliveryTimeline?: string;
  paymentMilestones?: string;
  terms?: string;
  frozenAt: Date;
  frozenByName?: string;
  note?: string;
}

export interface IQuotationActivity {
  type: string;
  message: string;
  meta?: Record<string, unknown>;
  createdBy?: Types.ObjectId | null;
  createdByName?: string;
  createdAt: Date;
}

export interface IAgencyQuotation extends Document {
  id: string;
  code: string;
  documentGroupId: Types.ObjectId;
  version: number;
  previousVersionId?: Types.ObjectId | null;
  supersededById?: Types.ObjectId | null;
  clientId: Types.ObjectId;
  projectId?: Types.ObjectId | null;
  title: string;
  status: QuotationStatus;
  issueDate?: Date;
  expiryDate?: Date;
  validityDays: number;
  currency: CurrencyCode;
  taxConfig: IQuotationTaxConfig;
  documentDiscountPercent: number;
  documentDiscountMinor: number;
  lineItems: IQuotationLine[];
  subtotalMinor: number;
  discountTotalMinor: number;
  taxMinor: number;
  grandTotalMinor: number;
  taxBreakdown: Array<{ name: string; percent: number; amountMinor: number }>;
  scopeOfWork?: string;
  exclusions?: string;
  assumptions?: string;
  deliveryTimeline?: string;
  paymentMilestones?: string;
  terms?: string;
  /** Never included in client-facing PDFs */
  internalNotes?: string;
  templateId?: Types.ObjectId | null;
  versionHistory: IQuotationSnapshot[];
  /** Accepted quotation → project (no duplicate create) */
  convertedProjectId?: Types.ObjectId | null;
  /** Marks ready for invoice module — does not create an invoice */
  invoiceReady: boolean;
  invoiceReadyAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  activityLog: IQuotationActivity[];
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taxRateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    percent: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false },
);

const taxPartSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    percent: { type: Number, required: true, min: 0, max: 100 },
    amountMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const lineSchema = new Schema<IQuotationLine>(
  {
    key: { type: String, required: true, trim: true, maxlength: 64 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    quantity: { type: Number, required: true, min: 0.01 },
    unitPriceMinor: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountMinor: { type: Number, default: 0, min: 0 },
    lineGrossMinor: { type: Number, required: true, min: 0 },
    lineDiscountTotalMinor: { type: Number, required: true, min: 0 },
    lineNetMinor: { type: Number, required: true, min: 0 },
    lineTaxMinor: { type: Number, required: true, min: 0 },
    lineTotalMinor: { type: Number, required: true, min: 0 },
    taxBreakdown: { type: [taxPartSchema], default: [] },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', default: null },
    catalogItemId: { type: Schema.Types.ObjectId, ref: 'QuotationCatalogItem', default: null },
    unit: { type: String, trim: true, maxlength: 40 },
  },
  { _id: false },
);

const snapshotSchema = new Schema<IQuotationSnapshot>(
  {
    version: { type: Number, required: true },
    code: { type: String, required: true },
    status: { type: String, required: true },
    title: { type: String, required: true },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    currency: { type: String, required: true },
    taxConfig: {
      mode: { type: String, required: true },
      rates: { type: [taxRateSchema], default: [] },
    },
    lineItems: { type: [lineSchema], default: [] },
    subtotalMinor: { type: Number, required: true },
    discountTotalMinor: { type: Number, required: true },
    taxMinor: { type: Number, required: true },
    grandTotalMinor: { type: Number, required: true },
    taxBreakdown: { type: [taxPartSchema], default: [] },
    scopeOfWork: { type: String },
    exclusions: { type: String },
    assumptions: { type: String },
    deliveryTimeline: { type: String },
    paymentMilestones: { type: String },
    terms: { type: String },
    frozenAt: { type: Date, required: true },
    frozenByName: { type: String },
    note: { type: String },
  },
  { _id: true },
);

const activitySchema = new Schema<IQuotationActivity>(
  {
    type: { type: String, required: true, trim: true, maxlength: 80 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    meta: { type: Schema.Types.Mixed },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdByName: { type: String, trim: true, maxlength: 160 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const quotationSchema = new Schema<IAgencyQuotation>(
  {
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 48 },
    documentGroupId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    version: { type: Number, required: true, min: 1, default: 1 },
    previousVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'AgencyQuotation',
      default: null,
    },
    supersededById: {
      type: Schema.Types.ObjectId,
      ref: 'AgencyQuotation',
      default: null,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'AgencyClient',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'AgencyProject',
      default: null,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    status: {
      type: String,
      enum: ['draft', 'issued', 'accepted', 'rejected', 'expired', 'revised'],
      default: 'draft',
      index: true,
    },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    validityDays: { type: Number, default: 15, min: 1, max: 365 },
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
      rates: { type: [taxRateSchema], default: () => [{ name: 'GST', percent: 18 }] },
    },
    documentDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
    documentDiscountMinor: { type: Number, default: 0, min: 0 },
    lineItems: { type: [lineSchema], default: [] },
    subtotalMinor: { type: Number, default: 0, min: 0 },
    discountTotalMinor: { type: Number, default: 0, min: 0 },
    taxMinor: { type: Number, default: 0, min: 0 },
    grandTotalMinor: { type: Number, default: 0, min: 0 },
    taxBreakdown: { type: [taxPartSchema], default: [] },
    scopeOfWork: { type: String, trim: true, maxlength: 10000 },
    exclusions: { type: String, trim: true, maxlength: 5000 },
    assumptions: { type: String, trim: true, maxlength: 5000 },
    deliveryTimeline: { type: String, trim: true, maxlength: 5000 },
    paymentMilestones: { type: String, trim: true, maxlength: 5000 },
    terms: { type: String, trim: true, maxlength: 10000 },
    internalNotes: { type: String, trim: true, maxlength: 5000 },
    templateId: { type: Schema.Types.ObjectId, ref: 'QuotationTemplate', default: null },
    versionHistory: { type: [snapshotSchema], default: [] },
    convertedProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'AgencyProject',
      default: null,
      index: true,
    },
    invoiceReady: { type: Boolean, default: false, index: true },
    invoiceReadyAt: { type: Date },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 2000 },
    activityLog: { type: [activitySchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

applySoftDeleteQuery(quotationSchema);

quotationSchema.index({ code: 1, isDeleted: 1 }, { unique: true });
quotationSchema.index({ documentGroupId: 1, version: -1 });
quotationSchema.index({ clientId: 1, status: 1, createdAt: -1 });
quotationSchema.index({ status: 1, expiryDate: 1 });
quotationSchema.index({ title: 'text', code: 'text', internalNotes: 'text' });

export const AgencyQuotation = model<IAgencyQuotation>('AgencyQuotation', quotationSchema);
