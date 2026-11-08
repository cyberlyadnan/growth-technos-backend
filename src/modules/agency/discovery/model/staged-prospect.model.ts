import { Schema, model, Document, Types } from 'mongoose';

export type StagedProspectStatus =
  | 'discovered'
  | 'research_pending'
  | 'researched'
  | 'qualified'
  | 'approved'
  | 'rejected';

export const ProspectReviewStatus = {
  STAGED: 'staged',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ProspectReviewStatus = (typeof ProspectReviewStatus)[keyof typeof ProspectReviewStatus];

export type QualificationGrade = 'A' | 'B' | 'C' | 'D';

export interface IScoreBreakdown {
  industryFit: number;          // max 20
  scaleAndBudget: number;       // max 20
  technicalOpportunity: number; // max 25
  contactability: number;       // max 20
  businessUrgency: number;      // max 15
}

export interface IProspectScore {
  total: number;
  grade: QualificationGrade;
  breakdown: IScoreBreakdown;
  reasoning: string[];
}

export interface IProspectVerifiedFacts {
  sslActive: boolean;
  serverFramework?: string;
  dnsMxConfigured: boolean;
  httpStatus?: number;
  ttfbMs?: number;
}

export interface IProspectDigitalPresence {
  websiteQuality: 'Poor' | 'Fair' | 'Good' | 'Modern';
  mobileResponsive: boolean;
  seoHealthScore?: number;
  techStackDetected: string[];
}

export interface IProspectDecisionMaker {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  isPubliclyIdentifiable: boolean;
}

export interface IProspectGrowthOpportunity {
  category: string;
  potentialPainPoint: string;
  proposedSolution: string;
  estimatedBudgetInr: number;
}

export interface IProspectDossier {
  summary: string;
  verifiedFacts: IProspectVerifiedFacts;
  digitalPresence: IProspectDigitalPresence;
  decisionMakers: IProspectDecisionMaker[];
  growthOpportunities: IProspectGrowthOpportunity[];
  confidenceLevel: 'High' | 'Medium' | 'Low';
  researchDate: Date;
  evidenceUrls: string[];
}

export interface IProspectDuplicateCheck {
  isDuplicate: boolean;
  existingClientId?: Types.ObjectId | null;
  existingClientCode?: string;
  existingClientName?: string;
  matchType?: 'exact_domain' | 'company_name' | 'email';
}

export interface IStagedProspect extends Document {
  id: string;
  jobId: string;
  companyName: string;
  domain: string;
  normalizedDomain: string;
  websiteUrl?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  country: string;
  industry: string;
  category?: string;
  estimatedHeadcount?: number;
  discoverySource: string;
  status: StagedProspectStatus;
  score: IProspectScore;
  dossier: IProspectDossier;
  duplicateCheck: IProspectDuplicateCheck;
  rejectionReason?: string;
  approvedAt?: Date | null;
  approvedClientId?: Types.ObjectId | null;
  approvedClientCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const scoreBreakdownSchema = new Schema<IScoreBreakdown>(
  {
    industryFit: { type: Number, default: 0, min: 0, max: 20 },
    scaleAndBudget: { type: Number, default: 0, min: 0, max: 20 },
    technicalOpportunity: { type: Number, default: 0, min: 0, max: 25 },
    contactability: { type: Number, default: 0, min: 0, max: 20 },
    businessUrgency: { type: Number, default: 0, min: 0, max: 15 },
  },
  { _id: false },
);

const prospectScoreSchema = new Schema<IProspectScore>(
  {
    total: { type: Number, default: 0, min: 0, max: 100, index: true },
    grade: { type: String, enum: ['A', 'B', 'C', 'D'], default: 'C', index: true },
    breakdown: { type: scoreBreakdownSchema, default: () => ({}) },
    reasoning: [{ type: String, trim: true }],
  },
  { _id: false },
);

const verifiedFactsSchema = new Schema<IProspectVerifiedFacts>(
  {
    sslActive: { type: Boolean, default: false },
    serverFramework: { type: String, trim: true },
    dnsMxConfigured: { type: Boolean, default: false },
    httpStatus: { type: Number },
    ttfbMs: { type: Number },
  },
  { _id: false },
);

const digitalPresenceSchema = new Schema<IProspectDigitalPresence>(
  {
    websiteQuality: {
      type: String,
      enum: ['Poor', 'Fair', 'Good', 'Modern'],
      default: 'Fair',
    },
    mobileResponsive: { type: Boolean, default: true },
    seoHealthScore: { type: Number, min: 0, max: 100 },
    techStackDetected: [{ type: String, trim: true }],
  },
  { _id: false },
);

const decisionMakerSchema = new Schema<IProspectDecisionMaker>(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, default: 'Director / Business Owner', trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    isPubliclyIdentifiable: { type: Boolean, default: true },
  },
  { _id: false },
);

const growthOpportunitySchema = new Schema<IProspectGrowthOpportunity>(
  {
    category: { type: String, required: true, trim: true },
    potentialPainPoint: { type: String, required: true, trim: true },
    proposedSolution: { type: String, required: true, trim: true },
    estimatedBudgetInr: { type: Number, default: 100000 },
  },
  { _id: false },
);

const prospectDossierSchema = new Schema<IProspectDossier>(
  {
    summary: { type: String, default: '', trim: true },
    verifiedFacts: { type: verifiedFactsSchema, default: () => ({}) },
    digitalPresence: { type: digitalPresenceSchema, default: () => ({}) },
    decisionMakers: [decisionMakerSchema],
    growthOpportunities: [growthOpportunitySchema],
    confidenceLevel: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
    },
    researchDate: { type: Date, default: Date.now },
    evidenceUrls: [{ type: String, trim: true }],
  },
  { _id: false },
);

const duplicateCheckSchema = new Schema<IProspectDuplicateCheck>(
  {
    isDuplicate: { type: Boolean, default: false, index: true },
    existingClientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', default: null },
    existingClientCode: { type: String, trim: true },
    existingClientName: { type: String, trim: true },
    matchType: { type: String, enum: ['exact_domain', 'company_name', 'email'] },
  },
  { _id: false },
);

const stagedProspectSchema = new Schema<IStagedProspect>(
  {
    jobId: { type: String, required: true, index: true },
    companyName: { type: String, required: true, trim: true, index: true },
    domain: { type: String, required: true, trim: true },
    normalizedDomain: { type: String, required: true, trim: true, index: true },
    websiteUrl: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, default: 'India', trim: true },
    industry: { type: String, required: true, trim: true, index: true },
    category: { type: String, trim: true },
    estimatedHeadcount: { type: Number, default: 15 },
    discoverySource: { type: String, default: 'serper', trim: true },
    status: {
      type: String,
      enum: ['discovered', 'research_pending', 'researched', 'qualified', 'approved', 'rejected'],
      default: 'qualified',
      index: true,
    },
    score: { type: prospectScoreSchema, required: true },
    dossier: { type: prospectDossierSchema, required: true },
    duplicateCheck: { type: duplicateCheckSchema, default: () => ({}) },
    rejectionReason: { type: String, trim: true },
    approvedAt: { type: Date, default: null },
    approvedClientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', default: null },
    approvedClientCode: { type: String, default: null, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  },
);

stagedProspectSchema.index({ jobId: 1, status: 1 });
stagedProspectSchema.index({ 'score.total': -1 });

export const StagedProspect = model<IStagedProspect>('StagedProspect', stagedProspectSchema);

