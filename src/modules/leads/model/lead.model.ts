import { Schema, model, Document, Types } from 'mongoose';
import {
  DeviceType,
  LeadEventType,
  LeadSource,
  LeadStatus,
  LeadType,
} from '@core/constants/leads';
import {
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
} from '@core/schemas/base.schema';
import {
  ILeadLocation,
  IScoreBreakdown,
  IUtmFields,
  leadLocationSchema,
  scoreBreakdownSchema,
  utmFieldsSchema,
} from '@core/schemas/lead-gen.schema';

export interface ILead extends Document {
  id: string;
  name?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  industry?: string;
  businessType?: string;
  serviceInterested?: string;
  monthlyBudget?: string;
  city?: string;
  message?: string;
  consent: boolean;
  customFields: Map<string, unknown>;
  leadType: LeadType;
  source: LeadSource;
  status: LeadStatus;
  campaignId?: Types.ObjectId | null;
  formId?: Types.ObjectId | null;
  offerId?: Types.ObjectId | null;
  magnetId?: Types.ObjectId | null;
  popupId?: Types.ObjectId | null;
  landingPage?: string;
  referrer?: string;
  utm: IUtmFields;
  ip?: string;
  userAgent?: string;
  browser?: string;
  device?: DeviceType | string;
  location?: ILeadLocation | null;
  assignedTo?: Types.ObjectId | null;
  score?: number | null;
  scoreBreakdown?: IScoreBreakdown | null;
  eventsTriggered: LeadEventType[];
  notes?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
  {
    name: { type: String, trim: true, maxlength: 160 },
    businessName: { type: String, trim: true, maxlength: 200 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, index: true },
    phone: { type: String, trim: true, maxlength: 40 },
    whatsapp: { type: String, trim: true, maxlength: 40 },
    industry: { type: String, trim: true, maxlength: 120, index: true },
    businessType: { type: String, trim: true, maxlength: 120 },
    serviceInterested: { type: String, trim: true, maxlength: 200 },
    monthlyBudget: { type: String, trim: true, maxlength: 80 },
    city: { type: String, trim: true, maxlength: 120 },
    message: { type: String, trim: true, maxlength: 5000 },
    consent: { type: Boolean, default: false },
    customFields: { type: Map, of: Schema.Types.Mixed, default: {} },
    leadType: {
      type: String,
      enum: Object.values(LeadType),
      default: LeadType.GENERAL_INQUIRY,
      index: true,
    },
    source: {
      type: String,
      enum: Object.values(LeadSource),
      default: LeadSource.WEBSITE,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(LeadStatus),
      default: LeadStatus.NEW,
      index: true,
    },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', default: null, index: true },
    formId: { type: Schema.Types.ObjectId, ref: 'LeadForm', default: null, index: true },
    offerId: { type: Schema.Types.ObjectId, ref: 'Offer', default: null },
    magnetId: { type: Schema.Types.ObjectId, ref: 'LeadMagnet', default: null },
    popupId: { type: Schema.Types.ObjectId, ref: 'PopupCampaign', default: null },
    landingPage: { type: String, trim: true, maxlength: 2000 },
    referrer: { type: String, trim: true, maxlength: 2000 },
    utm: { type: utmFieldsSchema, default: () => ({}) },
    ip: { type: String, trim: true, maxlength: 80 },
    userAgent: { type: String, trim: true, maxlength: 1000 },
    browser: { type: String, trim: true, maxlength: 120 },
    device: { type: String, trim: true, maxlength: 40 },
    location: { type: leadLocationSchema, default: null },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    score: { type: Number, default: null, min: 0, max: 100 },
    scoreBreakdown: { type: scoreBreakdownSchema, default: null },
    eventsTriggered: [
      {
        type: String,
        enum: Object.values(LeadEventType),
      },
    ],
    notes: { type: String, trim: true, maxlength: 5000 },
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

leadSchema.index({ industry: 1, status: 1 });
leadSchema.index({ 'utm.utmCampaign': 1, createdAt: -1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ formId: 1, createdAt: -1 });

applySoftDeleteQuery(leadSchema);

export const Lead = model<ILead>('Lead', leadSchema);
