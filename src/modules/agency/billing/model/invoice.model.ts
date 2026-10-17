import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';
import type { CurrencyCode } from '@core/utils/money';
import { DEFAULT_AGENCY_CURRENCY } from '@core/utils/money';
import type { GstTreatment, TaxMode } from '../service/billing-calc';

export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'credited';

export type InvoiceKind = 'invoice' | 'credit_note';

export interface IInvoiceLine {
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
  unit?: string;
  serviceId?: Types.ObjectId | null;
  catalogItemId?: Types.ObjectId | null;
}

export interface IInvoiceTaxConfig {
  mode: TaxMode;
  rates: Array<{ name: string; percent: number }>;
  treatment?: GstTreatment;
  gstPercent?: number;
  placeOfSupplyState?: string;
  supplierState?: string;
}

export interface IInvoiceBillingSnapshot {
  clientName: string;
  clientCode?: string;
  legalName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  paymentTermsDays: number;
}

export interface IInvoiceActivity {
  type: string;
  message: string;
  meta?: Record<string, unknown>;
  createdBy?: Types.ObjectId | null;
  createdByName?: string;
  createdAt: Date;
}

export interface IAgencyInvoice extends Document {
  id: string;
  code: string;
  kind: InvoiceKind;
  /** Credit notes reference the original invoice */
  originalInvoiceId?: Types.ObjectId | null;
  clientId: Types.ObjectId;
  projectId?: Types.ObjectId | null;
  quotationId?: Types.ObjectId | null;
  /** Optional link to a maintenance agreement billing period (reuse — not a parallel ledger). */
  maintenanceAgreementId?: Types.ObjectId | null;
  /** Unique per agreement period, e.g. 2026-Q1 or 2026-03 — used for duplicate draft prevention. */
  maintenancePeriodKey?: string;
  title: string;
  status: InvoiceStatus;
  issueDate?: Date;
  dueDate?: Date;
  paymentTermsDays: number;
  currency: CurrencyCode;
  taxConfig: IInvoiceTaxConfig;
  documentDiscountPercent: number;
  documentDiscountMinor: number;
  lineItems: IInvoiceLine[];
  subtotalMinor: number;
  discountTotalMinor: number;
  taxMinor: number;
  grandTotalMinor: number;
  taxBreakdown: Array<{ name: string; percent: number; amountMinor: number }>;
  /** Confirmed payments allocated (never pending/failed) */
  amountPaidMinor: number;
  /** Absolute credit applied from credit notes */
  amountCreditedMinor: number;
  balanceDueMinor: number;
  billingSnapshot?: IInvoiceBillingSnapshot;
  paymentTerms?: string;
  notes?: string;
  /** Never on client PDF */
  internalNotes?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  /** Optimistic concurrency for balance mutations */
  ledgerVersion: number;
  activityLog: IInvoiceActivity[];
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

const lineSchema = new Schema<IInvoiceLine>(
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
    unit: { type: String, trim: true, maxlength: 40 },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', default: null },
    catalogItemId: { type: Schema.Types.ObjectId, ref: 'QuotationCatalogItem', default: null },
  },
  { _id: false },
);

const billingSnapshotSchema = new Schema<IInvoiceBillingSnapshot>(
  {
    clientName: { type: String, required: true, trim: true, maxlength: 200 },
    clientCode: { type: String, trim: true, maxlength: 40 },
    legalName: { type: String, trim: true, maxlength: 200 },
    email: { type: String, trim: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 40 },
    taxId: { type: String, trim: true, maxlength: 40 },
    billingAddress: {
      line1: { type: String, trim: true, maxlength: 200 },
      line2: { type: String, trim: true, maxlength: 200 },
      city: { type: String, trim: true, maxlength: 100 },
      state: { type: String, trim: true, maxlength: 100 },
      postalCode: { type: String, trim: true, maxlength: 20 },
      country: { type: String, trim: true, maxlength: 100 },
    },
    paymentTermsDays: { type: Number, required: true, min: 0, max: 365 },
  },
  { _id: false },
);

const activitySchema = new Schema<IInvoiceActivity>(
  {
    type: { type: String, required: true, trim: true, maxlength: 80 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    meta: { type: Schema.Types.Mixed },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdByName: { type: String, trim: true, maxlength: 160 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const invoiceSchema = new Schema<IAgencyInvoice>(
  {
    code: { type: String, required: true, unique: true, trim: true, maxlength: 40, index: true },
    kind: { type: String, enum: ['invoice', 'credit_note'], default: 'invoice', index: true },
    originalInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'AgencyInvoice',
      default: null,
      index: true,
    },
    clientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'AgencyProject', default: null, index: true },
    quotationId: {
      type: Schema.Types.ObjectId,
      ref: 'AgencyQuotation',
      default: null,
      index: true,
    },
    maintenanceAgreementId: {
      type: Schema.Types.ObjectId,
      ref: 'MaintenanceAgreement',
      default: null,
      index: true,
    },
    maintenancePeriodKey: { type: String, trim: true, maxlength: 40, index: true },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    status: {
      type: String,
      enum: ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled', 'credited'],
      default: 'draft',
      index: true,
    },
    issueDate: { type: Date },
    dueDate: { type: Date, index: true },
    paymentTermsDays: { type: Number, default: 15, min: 0, max: 365 },
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
      rates: { type: [taxRateSchema], default: [] },
      treatment: {
        type: String,
        enum: ['intra_state', 'inter_state', 'none', 'custom'],
      },
      gstPercent: { type: Number, min: 0, max: 100 },
      placeOfSupplyState: { type: String, trim: true, maxlength: 100 },
      supplierState: { type: String, trim: true, maxlength: 100 },
    },
    documentDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
    documentDiscountMinor: { type: Number, default: 0, min: 0 },
    lineItems: { type: [lineSchema], default: [] },
    subtotalMinor: { type: Number, required: true, min: 0, default: 0 },
    discountTotalMinor: { type: Number, required: true, min: 0, default: 0 },
    taxMinor: { type: Number, required: true, min: 0, default: 0 },
    grandTotalMinor: { type: Number, required: true, min: 0, default: 0 },
    taxBreakdown: { type: [taxPartSchema], default: [] },
    amountPaidMinor: { type: Number, required: true, min: 0, default: 0 },
    amountCreditedMinor: { type: Number, required: true, min: 0, default: 0 },
    balanceDueMinor: { type: Number, required: true, min: 0, default: 0 },
    billingSnapshot: { type: billingSnapshotSchema },
    paymentTerms: { type: String, trim: true, maxlength: 5000 },
    notes: { type: String, trim: true, maxlength: 5000 },
    internalNotes: { type: String, trim: true, maxlength: 5000 },
    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true, maxlength: 2000 },
    ledgerVersion: { type: Number, required: true, default: 1, min: 1 },
    activityLog: { type: [activitySchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

invoiceSchema.index({ clientId: 1, status: 1, createdAt: -1 });
invoiceSchema.index({ projectId: 1, createdAt: -1 });
invoiceSchema.index({ kind: 1, originalInvoiceId: 1 });
/** Report / executive dashboard aggregations */
invoiceSchema.index({ kind: 1, status: 1, currency: 1, issueDate: -1 });
invoiceSchema.index({ kind: 1, status: 1, dueDate: 1, balanceDueMinor: 1 });
invoiceSchema.index(
  { maintenanceAgreementId: 1, maintenancePeriodKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      maintenanceAgreementId: { $type: 'objectId' },
      maintenancePeriodKey: { $type: 'string' },
    },
  },
);
applySoftDeleteQuery(invoiceSchema);

export const AgencyInvoice = model<IAgencyInvoice>('AgencyInvoice', invoiceSchema);
