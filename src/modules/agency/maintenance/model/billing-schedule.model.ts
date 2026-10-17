import { Schema, model, Document, Types } from 'mongoose';

/**
 * Per-period billing schedule for a maintenance agreement.
 * Unique (agreementId, periodKey) prevents duplicate recurring draft invoices.
 * Draft invoices are created via invoiceService — never auto-issued or auto-charged.
 */
export type ScheduleStatus = 'pending' | 'draft_created' | 'skipped' | 'cancelled';

export interface IMaintenanceBillingSchedule extends Document {
  id: string;
  agreementId: Types.ObjectId;
  clientId: Types.ObjectId;
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
  amountMinor: number;
  currency: string;
  status: ScheduleStatus;
  invoiceId?: Types.ObjectId | null;
  invoiceCode?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<IMaintenanceBillingSchedule>(
  {
    agreementId: {
      type: Schema.Types.ObjectId,
      ref: 'MaintenanceAgreement',
      required: true,
      index: true,
    },
    clientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', required: true, index: true },
    periodKey: { type: String, required: true, trim: true, maxlength: 40 },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    amountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, maxlength: 8 },
    status: {
      type: String,
      enum: ['pending', 'draft_created', 'skipped', 'cancelled'],
      default: 'pending',
      index: true,
    },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'AgencyInvoice', default: null },
    invoiceCode: { type: String, trim: true, maxlength: 40 },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

scheduleSchema.index({ agreementId: 1, periodKey: 1 }, { unique: true });

export const MaintenanceBillingSchedule = model<IMaintenanceBillingSchedule>(
  'MaintenanceBillingSchedule',
  scheduleSchema,
);
