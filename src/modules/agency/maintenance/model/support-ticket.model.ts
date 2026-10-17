import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';

export type SupportPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SupportStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_client'
  | 'resolved'
  | 'closed'
  | 'cancelled';

export interface ISupportWorkLog {
  description: string;
  minutesSpent: number;
  workedAt: Date;
  createdBy?: Types.ObjectId | null;
  createdByName?: string;
  createdAt: Date;
}

export interface ISupportDocument {
  fileName: string;
  url: string;
  mimeType?: string;
  uploadedAt?: Date;
}

export interface ISupportTicket extends Document {
  id: string;
  code: string;
  clientId: Types.ObjectId;
  projectId?: Types.ObjectId | null;
  agreementId?: Types.ObjectId | null;
  assetId?: Types.ObjectId | null;
  title: string;
  description: string;
  priority: SupportPriority;
  status: SupportStatus;
  assignedToUserId?: Types.ObjectId | null;
  assignedToName?: string;
  resolution?: string;
  totalMinutesSpent: number;
  workLogs: ISupportWorkLog[];
  documents: ISupportDocument[];
  resolvedAt?: Date;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const workLogSchema = new Schema<ISupportWorkLog>(
  {
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    minutesSpent: { type: Number, required: true, min: 0, max: 24 * 60 },
    workedAt: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdByName: { type: String, trim: true, maxlength: 160 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const documentSchema = new Schema<ISupportDocument>(
  {
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    url: { type: String, required: true, trim: true, maxlength: 2000 },
    mimeType: { type: String, trim: true, maxlength: 120 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    code: { type: String, required: true, unique: true, trim: true, maxlength: 40, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'AgencyProject', default: null, index: true },
    agreementId: {
      type: Schema.Types.ObjectId,
      ref: 'MaintenanceAgreement',
      default: null,
      index: true,
    },
    assetId: { type: Schema.Types.ObjectId, ref: 'AgencyAsset', default: null, index: true },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'waiting_client', 'resolved', 'closed', 'cancelled'],
      default: 'open',
      index: true,
    },
    assignedToUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    assignedToName: { type: String, trim: true, maxlength: 160 },
    resolution: { type: String, trim: true, maxlength: 10000 },
    totalMinutesSpent: { type: Number, default: 0, min: 0 },
    workLogs: { type: [workLogSchema], default: [] },
    documents: { type: [documentSchema], default: [] },
    resolvedAt: { type: Date },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

applySoftDeleteQuery(supportTicketSchema);
supportTicketSchema.index({ clientId: 1, status: 1, createdAt: -1 });

export const SupportTicket = model<ISupportTicket>('SupportTicket', supportTicketSchema);
