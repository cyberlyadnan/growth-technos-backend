import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';
import type { CurrencyCode } from '@core/utils/money';
import { DEFAULT_AGENCY_CURRENCY } from '@core/utils/money';
import type { PaymentMethod } from './payment.model';

export interface IReceiptInvoiceRef {
  invoiceId: Types.ObjectId;
  invoiceCode: string;
  amountMinor: number;
}

export interface IAgencyReceipt extends Document {
  id: string;
  code: string;
  paymentId: Types.ObjectId;
  paymentCode: string;
  clientId: Types.ObjectId;
  clientName: string;
  clientCode?: string;
  amountMinor: number;
  currency: CurrencyCode;
  method: PaymentMethod;
  paymentDate: Date;
  transactionRef?: string;
  invoiceRefs: IReceiptInvoiceRef[];
  /** Only issued when payment status is confirmed */
  issuedAt: Date;
  voidedAt?: Date;
  voidReason?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceRefSchema = new Schema<IReceiptInvoiceRef>(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: 'AgencyInvoice', required: true },
    invoiceCode: { type: String, required: true, trim: true, maxlength: 40 },
    amountMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const receiptSchema = new Schema<IAgencyReceipt>(
  {
    code: { type: String, required: true, unique: true, trim: true, maxlength: 40, index: true },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'AgencyPayment',
      required: true,
      unique: true,
      index: true,
    },
    paymentCode: { type: String, required: true, trim: true, maxlength: 40 },
    clientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', required: true, index: true },
    clientName: { type: String, required: true, trim: true, maxlength: 200 },
    clientCode: { type: String, trim: true, maxlength: 40 },
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
    },
    paymentDate: { type: Date, required: true },
    transactionRef: { type: String, trim: true, maxlength: 120 },
    invoiceRefs: { type: [invoiceRefSchema], default: [] },
    issuedAt: { type: Date, required: true, default: Date.now },
    voidedAt: { type: Date },
    voidReason: { type: String, trim: true, maxlength: 2000 },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

applySoftDeleteQuery(receiptSchema);

export const AgencyReceipt = model<IAgencyReceipt>('AgencyReceipt', receiptSchema);
