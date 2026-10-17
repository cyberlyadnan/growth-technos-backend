import { Schema, model, Document, Types } from 'mongoose';

/**
 * Central AMS activity log.
 * Never store secrets (passwords, API keys, tokens) in message or meta.
 * Financial events are immutable — silent edits/deletes are refused.
 */
export type ActivityEntityType =
  | 'client'
  | 'project'
  | 'quotation'
  | 'invoice'
  | 'payment'
  | 'expense'
  | 'asset'
  | 'credential'
  | 'renewal'
  | 'maintenance'
  | 'support'
  | 'document'
  | 'handover'
  | 'agency';

export interface IAgencyActivity extends Document {
  id: string;
  actorId?: Types.ObjectId | null;
  actorEmail?: string;
  actorName?: string;
  action: string;
  entityType: ActivityEntityType;
  entityId?: Types.ObjectId | null;
  entityCode?: string;
  clientId?: Types.ObjectId | null;
  projectId?: Types.ObjectId | null;
  message: string;
  /** Safe metadata only — never secrets */
  meta?: Record<string, unknown>;
  /** When true, update/delete APIs refuse changes */
  immutable: boolean;
  createdAt: Date;
}

const activitySchema = new Schema<IAgencyActivity>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorEmail: { type: String, trim: true, maxlength: 200 },
    actorName: { type: String, trim: true, maxlength: 160 },
    action: { type: String, required: true, trim: true, maxlength: 80, index: true },
    entityType: {
      type: String,
      required: true,
      enum: [
        'client',
        'project',
        'quotation',
        'invoice',
        'payment',
        'expense',
        'asset',
        'credential',
        'renewal',
        'maintenance',
        'support',
        'document',
        'handover',
        'agency',
      ],
      index: true,
    },
    entityId: { type: Schema.Types.ObjectId, default: null, index: true },
    entityCode: { type: String, trim: true, maxlength: 40 },
    clientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', default: null, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'AgencyProject', default: null, index: true },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    meta: { type: Schema.Types.Mixed },
    immutable: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activitySchema.index({ createdAt: -1 });
activitySchema.index({ clientId: 1, createdAt: -1 });
activitySchema.index({ projectId: 1, createdAt: -1 });

export const AgencyActivity = model<IAgencyActivity>('AgencyActivity', activitySchema);

/** Actions that must never be silently altered. */
export const FINANCIAL_IMMUTABLE_ACTIONS = new Set([
  'invoice_issued',
  'invoice_cancelled',
  'credit_note_created',
  'payment_confirmed',
  'payment_allocated',
  'payment_refunded',
  'expense_finalized',
  'expense_voided',
  'maintenance_billing_draft',
]);
