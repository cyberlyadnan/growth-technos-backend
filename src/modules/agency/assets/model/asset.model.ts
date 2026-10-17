import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';
import type { CurrencyCode } from '@core/utils/money';
import { DEFAULT_AGENCY_CURRENCY } from '@core/utils/money';

export type AssetType =
  | 'hosting'
  | 'domain'
  | 'dns'
  | 'cloud'
  | 'email'
  | 'subscription'
  | 'deployment'
  | 'other';

export type AssetOwnership = 'client_owned' | 'agency_owned' | 'shared';

export type PaymentResponsibility = 'client' | 'agency' | 'shared';

export type AssetStatus = 'active' | 'expiring_soon' | 'expired' | 'cancelled' | 'archived';

export type RenewalCycle = 'monthly' | 'quarterly' | 'yearly' | 'biennial' | 'custom';

export interface IAssetActivity {
  type: string;
  message: string;
  meta?: Record<string, unknown>;
  createdBy?: Types.ObjectId | null;
  createdByName?: string;
  createdAt: Date;
}

export interface IAgencyAsset extends Document {
  id: string;
  code: string;
  clientId: Types.ObjectId;
  projectId?: Types.ObjectId | null;
  assetType: AssetType;
  provider: string;
  accountName: string;
  urlOrIdentifier?: string;
  ownership: AssetOwnership;
  responsiblePerson?: string;
  registrationDate?: Date;
  expiryDate?: Date;
  sslExpiryDate?: Date;
  /** Date only — maintenance contracts module is out of scope; field tracks agreement end if known. */
  maintenanceAgreementDate?: Date;
  renewalCycle?: RenewalCycle;
  expectedCostMinor?: number;
  actualCostMinor?: number;
  clientChargeMinor?: number;
  currency: CurrencyCode;
  paymentResponsibility: PaymentResponsibility;
  status: AssetStatus;
  notes?: string;
  activityLog: IAssetActivity[];
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<IAssetActivity>(
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

const assetSchema = new Schema<IAgencyAsset>(
  {
    code: { type: String, required: true, unique: true, trim: true, maxlength: 40, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'AgencyProject', default: null, index: true },
    assetType: {
      type: String,
      enum: ['hosting', 'domain', 'dns', 'cloud', 'email', 'subscription', 'deployment', 'other'],
      required: true,
      index: true,
    },
    provider: { type: String, required: true, trim: true, maxlength: 200 },
    accountName: { type: String, required: true, trim: true, maxlength: 200 },
    urlOrIdentifier: { type: String, trim: true, maxlength: 2000 },
    ownership: {
      type: String,
      enum: ['client_owned', 'agency_owned', 'shared'],
      required: true,
      index: true,
    },
    responsiblePerson: { type: String, trim: true, maxlength: 200 },
    registrationDate: { type: Date },
    expiryDate: { type: Date, index: true },
    sslExpiryDate: { type: Date, index: true },
    maintenanceAgreementDate: { type: Date },
    renewalCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly', 'biennial', 'custom'],
    },
    expectedCostMinor: { type: Number, min: 0 },
    actualCostMinor: { type: Number, min: 0 },
    clientChargeMinor: { type: Number, min: 0 },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'],
      default: DEFAULT_AGENCY_CURRENCY,
    },
    paymentResponsibility: {
      type: String,
      enum: ['client', 'agency', 'shared'],
      default: 'agency',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'expiring_soon', 'expired', 'cancelled', 'archived'],
      default: 'active',
      index: true,
    },
    notes: { type: String, trim: true, maxlength: 5000 },
    activityLog: { type: [activitySchema], default: [] },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

applySoftDeleteQuery(assetSchema);

assetSchema.index({ clientId: 1, assetType: 1, status: 1 });
assetSchema.index({ provider: 'text', accountName: 'text', urlOrIdentifier: 'text' });

export const AgencyAsset = model<IAgencyAsset>('AgencyAsset', assetSchema);
