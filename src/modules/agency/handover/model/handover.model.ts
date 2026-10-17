import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';

export type ChecklistItemKey =
  | 'deliverables'
  | 'source_code'
  | 'deployment_docs'
  | 'domain_hosting_ownership'
  | 'backups'
  | 'training'
  | 'client_acceptance'
  | 'outstanding_payments'
  | 'warranty_maintenance'
  | 'custom';

export type ChecklistItemStatus = 'pending' | 'completed' | 'waived' | 'blocked';

export type HandoverStatus = 'draft' | 'in_progress' | 'ready_for_review' | 'completed' | 'cancelled';

export interface IHandoverChecklistItem {
  key: ChecklistItemKey;
  label: string;
  status: ChecklistItemStatus;
  responsiblePerson?: string;
  notes?: string;
  /** Never store secrets here — reference credential vault transfer instead */
  blockedReason?: string;
  completedAt?: Date;
  completedByName?: string;
  waivedAt?: Date;
  waivedReason?: string;
}

export interface IProjectHandover extends Document {
  id: string;
  code: string;
  clientId: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  status: HandoverStatus;
  checklist: IHandoverChecklistItem[];
  /** Explicit reminder: credentials transferred via vault, not in PDF */
  credentialTransferNotes?: string;
  warrantyTerms?: string;
  maintenanceTerms?: string;
  clientAcceptanceNotes?: string;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  completedByName?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_HANDOVER_CHECKLIST: Array<{ key: ChecklistItemKey; label: string }> = [
  { key: 'deliverables', label: 'Deliverables handed over' },
  { key: 'source_code', label: 'Source-code repository references shared' },
  { key: 'deployment_docs', label: 'Deployment documentation provided' },
  { key: 'domain_hosting_ownership', label: 'Domain / hosting ownership confirmed' },
  { key: 'backups', label: 'Backup records verified' },
  { key: 'training', label: 'Client training completed' },
  { key: 'client_acceptance', label: 'Client acceptance received' },
  { key: 'outstanding_payments', label: 'Outstanding payments cleared or noted' },
  { key: 'warranty_maintenance', label: 'Warranty / maintenance terms agreed' },
];

const checklistItemSchema = new Schema<IHandoverChecklistItem>(
  {
    key: {
      type: String,
      enum: [
        'deliverables',
        'source_code',
        'deployment_docs',
        'domain_hosting_ownership',
        'backups',
        'training',
        'client_acceptance',
        'outstanding_payments',
        'warranty_maintenance',
        'custom',
      ],
      required: true,
    },
    label: { type: String, required: true, trim: true, maxlength: 240 },
    status: {
      type: String,
      enum: ['pending', 'completed', 'waived', 'blocked'],
      default: 'pending',
    },
    responsiblePerson: { type: String, trim: true, maxlength: 160 },
    notes: { type: String, trim: true, maxlength: 2000 },
    blockedReason: { type: String, trim: true, maxlength: 1000 },
    completedAt: { type: Date },
    completedByName: { type: String, trim: true, maxlength: 160 },
    waivedAt: { type: Date },
    waivedReason: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: true },
);

const handoverSchema = new Schema<IProjectHandover>(
  {
    code: { type: String, required: true, unique: true, trim: true, maxlength: 40, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'AgencyProject', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'ready_for_review', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    checklist: { type: [checklistItemSchema], default: [] },
    credentialTransferNotes: { type: String, trim: true, maxlength: 2000 },
    warrantyTerms: { type: String, trim: true, maxlength: 5000 },
    maintenanceTerms: { type: String, trim: true, maxlength: 5000 },
    clientAcceptanceNotes: { type: String, trim: true, maxlength: 5000 },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completedByName: { type: String, trim: true, maxlength: 160 },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

applySoftDeleteQuery(handoverSchema);
handoverSchema.index({ projectId: 1, status: 1 });

export const ProjectHandover = model<IProjectHandover>('ProjectHandover', handoverSchema);
