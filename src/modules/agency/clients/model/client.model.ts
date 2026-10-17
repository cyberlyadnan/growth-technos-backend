import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';
import type { CurrencyCode } from '@core/utils/money';
import { DEFAULT_AGENCY_CURRENCY } from '@core/utils/money';

export type AgencyClientType = 'individual' | 'company';
export type AgencyClientStatus = 'draft' | 'active' | 'inactive' | 'archived';

export interface IClientContactPerson {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  isPrimary?: boolean;
}

export interface IClientAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface IClientBillingPreferences {
  preferEmailInvoice?: boolean;
  invoiceEmail?: string;
  poRequired?: boolean;
}

export interface IClientAttachment {
  mediaId?: Types.ObjectId | null;
  url: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt: Date;
  uploadedBy?: Types.ObjectId | null;
}

export interface IClientActivityEntry {
  type: string;
  message: string;
  meta?: Record<string, unknown>;
  createdBy?: Types.ObjectId | null;
  createdByName?: string;
  createdAt: Date;
}

export interface IAgencyClient extends Document {
  id: string;
  code: string;
  clientType: AgencyClientType;
  name: string;
  legalName?: string;
  email?: string;
  emails: string[];
  phone?: string;
  phones: string[];
  contactPersons: IClientContactPerson[];
  billingAddress?: IClientAddress;
  taxId?: string;
  status: AgencyClientStatus;
  /** Soft-list compatibility — true when status === 'active' */
  isActive: boolean;
  source?: string;
  sourceLeadId?: Types.ObjectId | null;
  assignedAccountManagerId?: Types.ObjectId | null;
  tags: string[];
  notes?: string;
  paymentTermsDays: number;
  defaultCurrency: CurrencyCode;
  billingPreferences: IClientBillingPreferences;
  attachments: IClientAttachment[];
  activityLog: IClientActivityEntry[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const contactPersonSchema = new Schema<IClientContactPerson>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 40 },
    role: { type: String, trim: true, maxlength: 120 },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true },
);

const addressSchema = new Schema<IClientAddress>(
  {
    line1: { type: String, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 120 },
    state: { type: String, trim: true, maxlength: 120 },
    postalCode: { type: String, trim: true, maxlength: 30 },
    country: { type: String, trim: true, maxlength: 120 },
  },
  { _id: false },
);

const billingPreferencesSchema = new Schema<IClientBillingPreferences>(
  {
    preferEmailInvoice: { type: Boolean, default: true },
    invoiceEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },
    poRequired: { type: Boolean, default: false },
  },
  { _id: false },
);

const attachmentSchema = new Schema<IClientAttachment>(
  {
    mediaId: { type: Schema.Types.ObjectId, ref: 'BlogMedia', default: null },
    url: { type: String, required: true, trim: true, maxlength: 1000 },
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    mimeType: { type: String, trim: true, maxlength: 120 },
    sizeBytes: { type: Number, min: 0 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: true },
);

const activitySchema = new Schema<IClientActivityEntry>(
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

const agencyClientSchema = new Schema<IAgencyClient>(
  {
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
    clientType: {
      type: String,
      enum: ['individual', 'company'],
      required: true,
      default: 'company',
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    legalName: { type: String, trim: true, maxlength: 240 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, index: true },
    emails: [{ type: String, trim: true, lowercase: true, maxlength: 254 }],
    phone: { type: String, trim: true, maxlength: 40 },
    phones: [{ type: String, trim: true, maxlength: 40 }],
    contactPersons: { type: [contactPersonSchema], default: [] },
    billingAddress: { type: addressSchema },
    taxId: { type: String, trim: true, uppercase: true, maxlength: 40, index: true },
    status: {
      type: String,
      enum: ['draft', 'active', 'inactive', 'archived'],
      default: 'active',
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    source: { type: String, trim: true, maxlength: 80, index: true },
    sourceLeadId: { type: Schema.Types.ObjectId, ref: 'Lead', default: null, index: true },
    assignedAccountManagerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    tags: [{ type: String, trim: true, maxlength: 60 }],
    notes: { type: String, trim: true, maxlength: 5000 },
    paymentTermsDays: { type: Number, default: 15, min: 0, max: 365 },
    defaultCurrency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'],
      default: DEFAULT_AGENCY_CURRENCY,
    },
    billingPreferences: { type: billingPreferencesSchema, default: () => ({}) },
    attachments: { type: [attachmentSchema], default: [] },
    activityLog: { type: [activitySchema], default: [] },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

applySoftDeleteQuery(agencyClientSchema);

agencyClientSchema.index({ code: 1, isDeleted: 1 }, { unique: true });
agencyClientSchema.index(
  { email: 1, isDeleted: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } },
);
agencyClientSchema.index({ name: 'text', legalName: 'text', email: 'text', notes: 'text' });
agencyClientSchema.index({ status: 1, createdAt: -1 });
agencyClientSchema.index({ assignedAccountManagerId: 1, status: 1 });

export const AgencyClient = model<IAgencyClient>('AgencyClient', agencyClientSchema);
