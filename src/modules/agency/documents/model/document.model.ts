import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';

export type DocumentCategory =
  | 'quotation'
  | 'invoice'
  | 'agreement'
  | 'nda'
  | 'specification'
  | 'approval'
  | 'deliverable'
  | 'payment_proof'
  | 'maintenance_agreement'
  | 'handover_report'
  | 'other';

export interface IAgencyDocument extends Document {
  id: string;
  code: string;
  title: string;
  category: DocumentCategory;
  clientId: Types.ObjectId;
  projectId?: Types.ObjectId | null;
  handoverId?: Types.ObjectId | null;
  description?: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Private storage key — never a public CDN URL */
  storageKey: string;
  uploadedBy?: Types.ObjectId;
  uploadedByName?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IAgencyDocument>(
  {
    code: { type: String, required: true, unique: true, trim: true, maxlength: 40, index: true },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    category: {
      type: String,
      enum: [
        'quotation',
        'invoice',
        'agreement',
        'nda',
        'specification',
        'approval',
        'deliverable',
        'payment_proof',
        'maintenance_agreement',
        'handover_report',
        'other',
      ],
      required: true,
      index: true,
    },
    clientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'AgencyProject', default: null, index: true },
    handoverId: { type: Schema.Types.ObjectId, ref: 'ProjectHandover', default: null, index: true },
    description: { type: String, trim: true, maxlength: 2000 },
    originalFileName: { type: String, required: true, trim: true, maxlength: 255 },
    mimeType: { type: String, required: true, trim: true, maxlength: 120 },
    sizeBytes: { type: Number, required: true, min: 1 },
    storageKey: { type: String, required: true, trim: true, maxlength: 120, select: false },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    uploadedByName: { type: String, trim: true, maxlength: 160 },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

applySoftDeleteQuery(documentSchema);
documentSchema.index({ clientId: 1, category: 1, createdAt: -1 });

export const AgencyDocument = model<IAgencyDocument>('AgencyDocument', documentSchema);
