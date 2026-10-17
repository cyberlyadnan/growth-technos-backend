import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';
import type { CurrencyCode } from '@core/utils/money';
import { DEFAULT_AGENCY_CURRENCY } from '@core/utils/money';

export type BillingFrequency = 'monthly' | 'quarterly' | 'annual' | 'custom';

export type AgreementStatus =
  | 'draft'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'terminated'
  | 'cancelled';

export interface IAgreementActivity {
  type: string;
  message: string;
  meta?: Record<string, unknown>;
  createdBy?: Types.ObjectId | null;
  createdByName?: string;
  createdAt: Date;
}

export interface IMaintenanceAgreement extends Document {
  id: string;
  code: string;
  clientId: Types.ObjectId;
  projectId?: Types.ObjectId | null;
  planName: string;
  serviceCoverage: string;
  startDate: Date;
  endDate?: Date;
  renewalDate?: Date;
  billingFrequency: BillingFrequency;
  /** For custom cycles — days between billings */
  customIntervalDays?: number;
  recurringChargeMinor: number;
  currency: CurrencyCode;
  hostingChargeMinor: number;
  domainChargeMinor: number;
  hostingIncluded: boolean;
  domainIncluded: boolean;
  includedWork?: string;
  limitations?: string;
  exclusions?: string;
  responseExpectations?: string;
  renewalTerms?: string;
  status: AgreementStatus;
  terminatedAt?: Date;
  terminationReason?: string;
  nextBillingDate?: Date;
  linkedAssetIds: Types.ObjectId[];
  activityLog: IAgreementActivity[];
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<IAgreementActivity>(
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

const agreementSchema = new Schema<IMaintenanceAgreement>(
  {
    code: { type: String, required: true, unique: true, trim: true, maxlength: 40, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'AgencyProject', default: null, index: true },
    planName: { type: String, required: true, trim: true, maxlength: 200 },
    serviceCoverage: { type: String, required: true, trim: true, maxlength: 5000 },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, index: true },
    renewalDate: { type: Date, index: true },
    billingFrequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual', 'custom'],
      required: true,
      index: true,
    },
    customIntervalDays: { type: Number, min: 1, max: 730 },
    recurringChargeMinor: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'],
      default: DEFAULT_AGENCY_CURRENCY,
    },
    hostingChargeMinor: { type: Number, default: 0, min: 0 },
    domainChargeMinor: { type: Number, default: 0, min: 0 },
    hostingIncluded: { type: Boolean, default: false },
    domainIncluded: { type: Boolean, default: false },
    includedWork: { type: String, trim: true, maxlength: 10000 },
    limitations: { type: String, trim: true, maxlength: 10000 },
    exclusions: { type: String, trim: true, maxlength: 10000 },
    responseExpectations: { type: String, trim: true, maxlength: 5000 },
    renewalTerms: { type: String, trim: true, maxlength: 5000 },
    status: {
      type: String,
      enum: ['draft', 'active', 'expiring_soon', 'expired', 'terminated', 'cancelled'],
      default: 'draft',
      index: true,
    },
    terminatedAt: { type: Date },
    terminationReason: { type: String, trim: true, maxlength: 2000 },
    nextBillingDate: { type: Date, index: true },
    linkedAssetIds: [{ type: Schema.Types.ObjectId, ref: 'AgencyAsset' }],
    activityLog: { type: [activitySchema], default: [] },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

applySoftDeleteQuery(agreementSchema);
agreementSchema.index({ clientId: 1, status: 1 });
agreementSchema.index({ renewalDate: 1, status: 1 });

export const MaintenanceAgreement = model<IMaintenanceAgreement>(
  'MaintenanceAgreement',
  agreementSchema,
);
