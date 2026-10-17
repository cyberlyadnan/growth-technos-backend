import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';
import type { CurrencyCode } from '@core/utils/money';
import { DEFAULT_AGENCY_CURRENCY } from '@core/utils/money';

export type PaymentMethod =
  | 'bank_transfer'
  | 'upi'
  | 'cash'
  | 'cheque'
  | 'card'
  | 'other';

export type PaymentStatus =
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'reversed'
  | 'refunded';

export interface IPaymentAllocation {
  key: string;
  invoiceId: Types.ObjectId;
  invoiceCode?: string;
  amountMinor: number;
  allocatedAt: Date;
  reversedAt?: Date;
  reversalReason?: string;
}

export interface IPaymentAttachment {
  id?: string;
  fileName: string;
  url: string;
  mimeType?: string;
  uploadedAt?: Date;
}

export interface IPaymentActivity {
  type: string;
  message: string;
  meta?: Record<string, unknown>;
  createdBy?: Types.ObjectId | null;
  createdByName?: string;
  createdAt: Date;
}

export interface IAgencyPayment extends Document {
  id: string;
  code: string;
  clientId: Types.ObjectId;
  amountMinor: number;
  currency: CurrencyCode;
  method: PaymentMethod;
  status: PaymentStatus;
  paymentDate: Date;
  transactionRef?: string;
  notes?: string;
  internalNotes?: string;
  /** Client-supplied key to prevent duplicate recording */
  idempotencyKey?: string;
  allocations: IPaymentAllocation[];
  /** amountMinor − active (non-reversed) allocations; advance/unallocated balance */
  unallocatedMinor: number;
  /** If this payment is a refund of another */
  refundOfPaymentId?: Types.ObjectId | null;
  attachments: IPaymentAttachment[];
  confirmedAt?: Date;
  failedAt?: Date;
  reversedAt?: Date;
  receiptId?: Types.ObjectId | null;
  activityLog: IPaymentActivity[];
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const allocationSchema = new Schema<IPaymentAllocation>(
  {
    key: { type: String, required: true, trim: true, maxlength: 64 },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'AgencyInvoice', required: true },
    invoiceCode: { type: String, trim: true, maxlength: 40 },
    amountMinor: { type: Number, required: true, min: 1 },
    allocatedAt: { type: Date, required: true, default: Date.now },
    reversedAt: { type: Date },
    reversalReason: { type: String, trim: true, maxlength: 2000 },
  },
  { _id: false },
);

const attachmentSchema = new Schema<IPaymentAttachment>(
  {
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    url: { type: String, required: true, trim: true, maxlength: 2000 },
    mimeType: { type: String, trim: true, maxlength: 120 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const activitySchema = new Schema<IPaymentActivity>(
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

const paymentSchema = new Schema<IAgencyPayment>(
  {
    code: { type: String, required: true, unique: true, trim: true, maxlength: 40, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', required: true, index: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'],
      default: DEFAULT_AGENCY_CURRENCY,
    },
    method: {
      type: String,
      enum: ['bank_transfer', 'upi', 'cash', 'cheque', 'card', 'other'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed', 'reversed', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentDate: { type: Date, required: true, index: true },
    transactionRef: { type: String, trim: true, maxlength: 120, index: true },
    notes: { type: String, trim: true, maxlength: 5000 },
    internalNotes: { type: String, trim: true, maxlength: 5000 },
    idempotencyKey: { type: String, trim: true, maxlength: 120 },
    allocations: { type: [allocationSchema], default: [] },
    unallocatedMinor: { type: Number, required: true, min: 0, default: 0 },
    refundOfPaymentId: {
      type: Schema.Types.ObjectId,
      ref: 'AgencyPayment',
      default: null,
      index: true,
    },
    attachments: { type: [attachmentSchema], default: [] },
    confirmedAt: { type: Date },
    failedAt: { type: Date },
    reversedAt: { type: Date },
    receiptId: { type: Schema.Types.ObjectId, ref: 'AgencyReceipt', default: null },
    activityLog: { type: [activitySchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

paymentSchema.index({ clientId: 1, status: 1, paymentDate: -1 });
paymentSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);
paymentSchema.index({ 'allocations.invoiceId': 1 });
applySoftDeleteQuery(paymentSchema);

export const AgencyPayment = model<IAgencyPayment>('AgencyPayment', paymentSchema);
