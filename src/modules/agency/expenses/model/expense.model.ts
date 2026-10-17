import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';
import type { CurrencyCode } from '@core/utils/money';
import { DEFAULT_AGENCY_CURRENCY } from '@core/utils/money';

export type ExpenseCategory =
  | 'hosting'
  | 'domains'
  | 'software_subscriptions'
  | 'contractors'
  | 'development'
  | 'advertising'
  | 'operating'
  | 'other';

export type ExpenseStatus = 'draft' | 'recorded' | 'finalized' | 'void';

export type ExpensePaymentStatus = 'unpaid' | 'paid' | 'partially_paid' | 'reimbursed';

export type RecurringInterval = 'monthly' | 'quarterly' | 'yearly';

export interface IExpenseDocument {
  fileName: string;
  url: string;
  mimeType?: string;
  uploadedAt?: Date;
}

export interface IExpenseActivity {
  type: string;
  message: string;
  meta?: Record<string, unknown>;
  createdBy?: Types.ObjectId | null;
  createdByName?: string;
  createdAt: Date;
}

export interface IAgencyExpense extends Document {
  id: string;
  code: string;
  status: ExpenseStatus;
  expenseDate: Date;
  category: ExpenseCategory;
  vendor: string;
  description: string;
  amountMinor: number;
  currency: CurrencyCode;
  paymentStatus: ExpensePaymentStatus;
  reference?: string;
  supportingDocument?: IExpenseDocument;
  clientId?: Types.ObjectId | null;
  projectId?: Types.ObjectId | null;
  isRecurring: boolean;
  recurringInterval?: RecurringInterval;
  idempotencyKey?: string;
  voidedAt?: Date;
  voidReason?: string;
  finalizedAt?: Date;
  activityLog: IExpenseActivity[];
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IExpenseDocument>(
  {
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    url: { type: String, required: true, trim: true, maxlength: 2000 },
    mimeType: { type: String, trim: true, maxlength: 120 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const activitySchema = new Schema<IExpenseActivity>(
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

const expenseSchema = new Schema<IAgencyExpense>(
  {
    code: { type: String, required: true, unique: true, trim: true, maxlength: 40, index: true },
    status: {
      type: String,
      enum: ['draft', 'recorded', 'finalized', 'void'],
      default: 'draft',
      index: true,
    },
    expenseDate: { type: Date, required: true, index: true },
    category: {
      type: String,
      enum: [
        'hosting',
        'domains',
        'software_subscriptions',
        'contractors',
        'development',
        'advertising',
        'operating',
        'other',
      ],
      required: true,
      index: true,
    },
    vendor: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'],
      default: DEFAULT_AGENCY_CURRENCY,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'partially_paid', 'reimbursed'],
      default: 'unpaid',
      index: true,
    },
    reference: { type: String, trim: true, maxlength: 120, index: true },
    supportingDocument: { type: documentSchema },
    clientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', default: null, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'AgencyProject', default: null, index: true },
    isRecurring: { type: Boolean, default: false, index: true },
    recurringInterval: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
    },
    idempotencyKey: { type: String, trim: true, maxlength: 120 },
    voidedAt: { type: Date },
    voidReason: { type: String, trim: true, maxlength: 2000 },
    finalizedAt: { type: Date },
    activityLog: { type: [activitySchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

expenseSchema.index({ category: 1, expenseDate: -1 });
expenseSchema.index({ clientId: 1, expenseDate: -1 });
expenseSchema.index({ projectId: 1, expenseDate: -1 });
expenseSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);
applySoftDeleteQuery(expenseSchema);

export const AgencyExpense = model<IAgencyExpense>('AgencyExpense', expenseSchema);
