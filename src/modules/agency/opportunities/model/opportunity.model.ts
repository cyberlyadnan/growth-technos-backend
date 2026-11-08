import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';

export type OpportunityCategory =
  | 'website_development'
  | 'ecommerce_development'
  | 'custom_crm'
  | 'erp_implementation'
  | 'saas_development'
  | 'mobile_application'
  | 'business_automation'
  | 'api_integrations'
  | 'seo_digital_marketing'
  | 'maintenance_support';

export type OpportunityStage =
  | 'discovery'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export interface IOpportunity extends Document {
  id: string;
  code: string;
  clientId: Types.ObjectId;
  clientName: string;
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  title: string;
  projectCategory: OpportunityCategory;
  clientRequirement: string;
  proposedSolution: string;
  estimatedValueInr: number;
  expectedCloseDate: Date;
  stage: OpportunityStage;
  probabilityPercent: number;
  nextAction?: string;
  notes?: string;
  proposalQuotationId?: Types.ObjectId | null;
  wonAt?: Date | null;
  lostReason?: string | null;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const opportunitySchema = new Schema<IOpportunity>(
  {
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 40, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', required: true, index: true },
    clientName: { type: String, required: true, trim: true, maxlength: 200 },
    contactPersonName: { type: String, trim: true, maxlength: 160 },
    contactPersonEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },
    contactPersonPhone: { type: String, trim: true, maxlength: 40 },
    title: { type: String, required: true, trim: true, maxlength: 250 },
    projectCategory: {
      type: String,
      enum: [
        'website_development',
        'ecommerce_development',
        'custom_crm',
        'erp_implementation',
        'saas_development',
        'mobile_application',
        'business_automation',
        'api_integrations',
        'seo_digital_marketing',
        'maintenance_support',
      ],
      required: true,
      index: true,
    },
    clientRequirement: { type: String, trim: true, default: '' },
    proposedSolution: { type: String, trim: true, default: '' },
    estimatedValueInr: { type: Number, required: true, min: 0, default: 0 },
    expectedCloseDate: { type: Date, required: true },
    stage: {
      type: String,
      enum: ['discovery', 'proposal', 'negotiation', 'won', 'lost'],
      default: 'discovery',
      index: true,
    },
    probabilityPercent: { type: Number, min: 0, max: 100, default: 25 },
    nextAction: { type: String, trim: true, maxlength: 500 },
    notes: { type: String, trim: true },
    proposalQuotationId: { type: Schema.Types.ObjectId, ref: 'AgencyQuotation', default: null },
    wonAt: { type: Date, default: null },
    lostReason: { type: String, trim: true },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

applySoftDeleteQuery(opportunitySchema);

export const Opportunity = model<IOpportunity>('AgencyOpportunity', opportunitySchema);

