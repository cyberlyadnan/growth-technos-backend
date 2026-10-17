import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';
import type { CurrencyCode } from '@core/utils/money';
import { DEFAULT_AGENCY_CURRENCY } from '@core/utils/money';

export type AgencyProjectStatus =
  | 'draft'
  | 'planned'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'cancelled'
  | 'archived';

export type AgencyProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

export type AgencyProjectBillingModel =
  | 'fixed_price'
  | 'milestone_based'
  | 'hourly'
  | 'recurring'
  | 'custom';

export type MilestoneStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
export type DeliverableStatus = 'pending' | 'delivered' | 'accepted' | 'rejected';
export type ChangeRequestStatus = 'open' | 'approved' | 'rejected' | 'applied';

export interface IProjectMoney {
  amountMinor: number;
  currency: CurrencyCode;
}

export interface IProjectScope {
  summary?: string;
  items: string[];
  version: number;
  isApproved: boolean;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId | null;
  approvedByName?: string;
}

export interface IProjectMilestone {
  key: string;
  title: string;
  description?: string;
  dueDate?: Date;
  status: MilestoneStatus;
  progressPercent: number;
  order: number;
  dependsOnKeys: string[];
}

export interface IProjectTask {
  key: string;
  title: string;
  description?: string;
  milestoneKey?: string;
  status: TaskStatus;
  priority: AgencyProjectPriority;
  assigneeId?: Types.ObjectId | null;
  dueDate?: Date;
}

export interface IProjectDeliverable {
  key: string;
  title: string;
  description?: string;
  status: DeliverableStatus;
  dueDate?: Date;
  deliveredAt?: Date;
  acceptedAt?: Date;
  acceptedByName?: string;
}

export interface IProjectDependency {
  key: string;
  description: string;
  fromMilestoneKey?: string;
  toMilestoneKey?: string;
}

export interface IProjectChangeRequest {
  key: string;
  title: string;
  description: string;
  status: ChangeRequestStatus;
  proposedScopeSummary?: string;
  proposedScopeItems?: string[];
  requestedAt: Date;
  requestedBy?: Types.ObjectId | null;
  requestedByName?: string;
  resolvedAt?: Date;
  resolvedByName?: string;
  resolutionNote?: string;
}

export interface IProjectApproval {
  key: string;
  type: 'scope' | 'milestone' | 'deliverable' | 'acceptance' | 'change_request';
  subjectKey?: string;
  status: 'approved' | 'rejected';
  note?: string;
  decidedAt: Date;
  decidedBy?: Types.ObjectId | null;
  decidedByName?: string;
}

export interface IProjectAcceptance {
  key: string;
  notes?: string;
  acceptedAt: Date;
  acceptedBy?: Types.ObjectId | null;
  acceptedByName?: string;
}

export interface IProjectAttachment {
  mediaId?: Types.ObjectId | null;
  url: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt: Date;
  uploadedBy?: Types.ObjectId | null;
}

export interface IProjectActivityEntry {
  type: string;
  message: string;
  meta?: Record<string, unknown>;
  createdBy?: Types.ObjectId | null;
  createdByName?: string;
  createdAt: Date;
}

export interface IAgencyProject extends Document {
  id: string;
  code: string;
  clientId: Types.ObjectId;
  name: string;
  description?: string;
  serviceCategory?: string;
  status: AgencyProjectStatus;
  priority: AgencyProjectPriority;
  assignedManagerId?: Types.ObjectId | null;
  startDate?: Date;
  targetDeliveryDate?: Date;
  completionDate?: Date;
  billingModel: AgencyProjectBillingModel;
  contractValue: IProjectMoney;
  /** Estimated cost metadata only — never treated as actual expense. */
  estimatedCostMinor?: number;
  scope: IProjectScope;
  milestones: IProjectMilestone[];
  tasks: IProjectTask[];
  deliverables: IProjectDeliverable[];
  dependencies: IProjectDependency[];
  changeRequests: IProjectChangeRequest[];
  approvals: IProjectApproval[];
  acceptanceRecords: IProjectAcceptance[];
  progressPercent: number;
  stagingUrl?: string;
  productionUrl?: string;
  warrantyDays: number;
  postDeliveryObligations?: string;
  /** Reference only — Quotation module may not exist yet. */
  quotationId?: Types.ObjectId | null;
  quotationCode?: string;
  /** Future invoice links — never created in this phase. */
  invoiceIds: Types.ObjectId[];
  portfolioProjectId?: Types.ObjectId | null;
  tags: string[];
  notes?: string;
  attachments: IProjectAttachment[];
  activityLog: IProjectActivityEntry[];
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const moneySchema = new Schema<IProjectMoney>(
  {
    amountMinor: { type: Number, required: true, min: 0, default: 0 },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'],
      default: DEFAULT_AGENCY_CURRENCY,
    },
  },
  { _id: false },
);

const scopeSchema = new Schema<IProjectScope>(
  {
    summary: { type: String, trim: true, maxlength: 5000 },
    items: [{ type: String, trim: true, maxlength: 500 }],
    version: { type: Number, default: 1, min: 1 },
    isApproved: { type: Boolean, default: false },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedByName: { type: String, trim: true, maxlength: 160 },
  },
  { _id: false },
);

const milestoneSchema = new Schema<IProjectMilestone>(
  {
    key: { type: String, required: true, trim: true, maxlength: 64 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'done', 'cancelled'],
      default: 'pending',
    },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    order: { type: Number, default: 0 },
    dependsOnKeys: [{ type: String, trim: true, maxlength: 64 }],
  },
  { _id: false },
);

const taskSchema = new Schema<IProjectTask>(
  {
    key: { type: String, required: true, trim: true, maxlength: 64 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    milestoneKey: { type: String, trim: true, maxlength: 64 },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'done', 'blocked'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    dueDate: { type: Date },
  },
  { _id: false },
);

const deliverableSchema = new Schema<IProjectDeliverable>(
  {
    key: { type: String, required: true, trim: true, maxlength: 64 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['pending', 'delivered', 'accepted', 'rejected'],
      default: 'pending',
    },
    dueDate: { type: Date },
    deliveredAt: { type: Date },
    acceptedAt: { type: Date },
    acceptedByName: { type: String, trim: true, maxlength: 160 },
  },
  { _id: false },
);

const dependencySchema = new Schema<IProjectDependency>(
  {
    key: { type: String, required: true, trim: true, maxlength: 64 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    fromMilestoneKey: { type: String, trim: true, maxlength: 64 },
    toMilestoneKey: { type: String, trim: true, maxlength: 64 },
  },
  { _id: false },
);

const changeRequestSchema = new Schema<IProjectChangeRequest>(
  {
    key: { type: String, required: true, trim: true, maxlength: 64 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    status: {
      type: String,
      enum: ['open', 'approved', 'rejected', 'applied'],
      default: 'open',
    },
    proposedScopeSummary: { type: String, trim: true, maxlength: 5000 },
    proposedScopeItems: [{ type: String, trim: true, maxlength: 500 }],
    requestedAt: { type: Date, default: Date.now },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    requestedByName: { type: String, trim: true, maxlength: 160 },
    resolvedAt: { type: Date },
    resolvedByName: { type: String, trim: true, maxlength: 160 },
    resolutionNote: { type: String, trim: true, maxlength: 2000 },
  },
  { _id: false },
);

const approvalSchema = new Schema<IProjectApproval>(
  {
    key: { type: String, required: true, trim: true, maxlength: 64 },
    type: {
      type: String,
      enum: ['scope', 'milestone', 'deliverable', 'acceptance', 'change_request'],
      required: true,
    },
    subjectKey: { type: String, trim: true, maxlength: 64 },
    status: { type: String, enum: ['approved', 'rejected'], required: true },
    note: { type: String, trim: true, maxlength: 2000 },
    decidedAt: { type: Date, default: Date.now },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedByName: { type: String, trim: true, maxlength: 160 },
  },
  { _id: false },
);

const acceptanceSchema = new Schema<IProjectAcceptance>(
  {
    key: { type: String, required: true, trim: true, maxlength: 64 },
    notes: { type: String, trim: true, maxlength: 2000 },
    acceptedAt: { type: Date, default: Date.now },
    acceptedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    acceptedByName: { type: String, trim: true, maxlength: 160 },
  },
  { _id: false },
);

const attachmentSchema = new Schema<IProjectAttachment>(
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

const activitySchema = new Schema<IProjectActivityEntry>(
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

const agencyProjectSchema = new Schema<IAgencyProject>(
  {
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'AgencyClient',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000 },
    serviceCategory: { type: String, trim: true, maxlength: 120, index: true },
    status: {
      type: String,
      enum: ['draft', 'planned', 'active', 'on_hold', 'completed', 'cancelled', 'archived'],
      default: 'draft',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    assignedManagerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    startDate: { type: Date },
    targetDeliveryDate: { type: Date },
    completionDate: { type: Date },
    billingModel: {
      type: String,
      enum: ['fixed_price', 'milestone_based', 'hourly', 'recurring', 'custom'],
      default: 'fixed_price',
      index: true,
    },
    contractValue: {
      type: moneySchema,
      default: () => ({ amountMinor: 0, currency: DEFAULT_AGENCY_CURRENCY }),
    },
    estimatedCostMinor: { type: Number, min: 0 },
    scope: {
      type: scopeSchema,
      default: () => ({ summary: '', items: [], version: 1, isApproved: false }),
    },
    milestones: { type: [milestoneSchema], default: [] },
    tasks: { type: [taskSchema], default: [] },
    deliverables: { type: [deliverableSchema], default: [] },
    dependencies: { type: [dependencySchema], default: [] },
    changeRequests: { type: [changeRequestSchema], default: [] },
    approvals: { type: [approvalSchema], default: [] },
    acceptanceRecords: { type: [acceptanceSchema], default: [] },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    stagingUrl: { type: String, trim: true, maxlength: 1000 },
    productionUrl: { type: String, trim: true, maxlength: 1000 },
    warrantyDays: { type: Number, default: 30, min: 0, max: 3650 },
    postDeliveryObligations: { type: String, trim: true, maxlength: 5000 },
    quotationId: { type: Schema.Types.ObjectId, default: null },
    quotationCode: { type: String, trim: true, uppercase: true, maxlength: 40 },
    invoiceIds: [{ type: Schema.Types.ObjectId }],
    portfolioProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'PortfolioProject',
      default: null,
    },
    tags: [{ type: String, trim: true, maxlength: 60 }],
    notes: { type: String, trim: true, maxlength: 5000 },
    attachments: { type: [attachmentSchema], default: [] },
    activityLog: { type: [activitySchema], default: [] },
    isActive: { type: Boolean, default: false, index: true },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

applySoftDeleteQuery(agencyProjectSchema);

agencyProjectSchema.index({ code: 1, isDeleted: 1 }, { unique: true });
agencyProjectSchema.index({ clientId: 1, status: 1, createdAt: -1 });
agencyProjectSchema.index({ assignedManagerId: 1, status: 1 });
agencyProjectSchema.index({ name: 'text', description: 'text', notes: 'text', code: 'text' });
agencyProjectSchema.index({ status: 1, createdAt: -1 });
agencyProjectSchema.index({ billingModel: 1, status: 1 });

export const AgencyProject = model<IAgencyProject>('AgencyProject', agencyProjectSchema);
