import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';

export type RenewalKind =
  | 'domain'
  | 'hosting'
  | 'ssl'
  | 'subscription'
  | 'maintenance_agreement'
  | 'other';

export type RenewalStatus = 'pending' | 'reminded' | 'completed' | 'cancelled';

export type NotificationChannel = 'in_app' | 'email';

export type NotificationDeliveryStatus =
  | 'not_attempted'
  | 'queued_in_app'
  | 'email_sent'
  | 'email_skipped_unconfigured'
  | 'email_failed';

export interface IAgencyRenewal extends Document {
  id: string;
  code: string;
  assetId: Types.ObjectId;
  clientId: Types.ObjectId;
  kind: RenewalKind;
  title: string;
  dueDate: Date;
  remindAt: Date;
  channels: NotificationChannel[];
  status: RenewalStatus;
  lastNotificationStatus: NotificationDeliveryStatus;
  lastNotifiedAt?: Date;
  notificationNote?: string;
  completedAt?: Date;
  notes?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const renewalSchema = new Schema<IAgencyRenewal>(
  {
    code: { type: String, required: true, unique: true, trim: true, maxlength: 40, index: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'AgencyAsset', required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', required: true, index: true },
    kind: {
      type: String,
      enum: ['domain', 'hosting', 'ssl', 'subscription', 'maintenance_agreement', 'other'],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    dueDate: { type: Date, required: true, index: true },
    remindAt: { type: Date, required: true, index: true },
    channels: {
      type: [{ type: String, enum: ['in_app', 'email'] }],
      default: ['in_app'],
    },
    status: {
      type: String,
      enum: ['pending', 'reminded', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    lastNotificationStatus: {
      type: String,
      enum: [
        'not_attempted',
        'queued_in_app',
        'email_sent',
        'email_skipped_unconfigured',
        'email_failed',
      ],
      default: 'not_attempted',
    },
    lastNotifiedAt: { type: Date },
    notificationNote: { type: String, trim: true, maxlength: 500 },
    completedAt: { type: Date },
    notes: { type: String, trim: true, maxlength: 2000 },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

applySoftDeleteQuery(renewalSchema);

renewalSchema.index({ status: 1, remindAt: 1 });

export const AgencyRenewal = model<IAgencyRenewal>('AgencyRenewal', renewalSchema);
