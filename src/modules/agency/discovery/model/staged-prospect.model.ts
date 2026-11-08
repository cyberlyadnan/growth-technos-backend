import { Schema, model, Document, Types } from 'mongoose';

export type QualificationGrade = 'A' | 'B' | 'C' | 'D';

export interface IQualificationScore {
  overallScore: number;
  grade: QualificationGrade;
  signalsBreakdown?: Record<string, number>;
  recommendation?: string;
}

export interface IVerifiedFacts {
  sslStatus?: boolean;
  ttfbMs?: number;
  serverHeader?: string;
  poweredByHeader?: string;
  techStack?: string[];
  isMobileResponsive?: boolean;
}

export interface IDigitalPresence {
  hasGoogleBusinessProfile?: boolean;
  googleRating?: number;
  googleReviewsCount?: number;
  socialLinks?: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

export interface IDecisionMaker {
  name: string;
  title: string;
  linkedinUrl?: string;
  email?: string;
  isVerified?: boolean;
}

export interface IGrowthOpportunity {
  title: string;
  category: string;
  estimatedValueInr?: number;
  urgency: 'high' | 'medium' | 'low';
  recommendedPitch: string;
}

export interface IDuplicateCheck {
  isDuplicate: boolean;
  matchedClientId?: Types.ObjectId | null;
  matchedClientName?: string | null;
  matchReason?: string | null;
}

export type ProspectReviewStatus = 'staged' | 'approved' | 'rejected';

export interface IStagedProspect extends Document {
  id: string;
  jobId: string;
  companyName: string;
  legalName?: string;
  domain: string;
  website?: string;
  industry: string;
  city: string;
  state: string;
  country: string;
  address?: string;
  phone?: string;
  email?: string;
  sourceProvider: string;
  qualificationScore: IQualificationScore;
  verifiedFacts?: IVerifiedFacts;
  digitalPresence?: IDigitalPresence;
  decisionMakers?: IDecisionMaker[];
  growthOpportunities?: IGrowthOpportunity[];
  duplicateCheck?: IDuplicateCheck;
  reviewStatus: ProspectReviewStatus;
  rejectionReason?: string;
  promotedClientId?: Types.ObjectId | null;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const stagedProspectSchema = new Schema<IStagedProspect>(
  {
    jobId: { type: String, required: true, index: true },
    companyName: { type: String, required: true, trim: true, index: true },
    legalName: { type: String, trim: true },
    domain: { type: String, required: true, trim: true, lowercase: true, index: true },
    website: { type: String, trim: true },
    industry: { type: String, required: true, trim: true, index: true },
    city: { type: String, required: true, trim: true, index: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, default: 'India' },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    sourceProvider: { type: String, default: 'serper', index: true },
    qualificationScore: {
      overallScore: { type: Number, default: 0, min: 0, max: 100, index: true },
      grade: { type: String, enum: ['A', 'B', 'C', 'D'], default: 'C', index: true },
      signalsBreakdown: { type: Schema.Types.Mixed },
      recommendation: { type: String, trim: true },
    },
    verifiedFacts: {
      sslStatus: { type: Boolean, default: false },
      ttfbMs: { type: Number },
      serverHeader: { type: String },
      poweredByHeader: { type: String },
      techStack: [{ type: String }],
      isMobileResponsive: { type: Boolean },
    },
    digitalPresence: {
      hasGoogleBusinessProfile: { type: Boolean },
      googleRating: { type: Number },
      googleReviewsCount: { type: Number },
      socialLinks: {
        linkedin: { type: String },
        facebook: { type: String },
        instagram: { type: String },
        twitter: { type: String },
      },
    },
    decisionMakers: [
      {
        name: { type: String, trim: true },
        title: { type: String, trim: true },
        linkedinUrl: { type: String, trim: true },
        email: { type: String, trim: true },
        isVerified: { type: Boolean, default: false },
      },
    ],
    growthOpportunities: [
      {
        title: { type: String, trim: true },
        category: { type: String, trim: true },
        estimatedValueInr: { type: Number },
        urgency: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
        recommendedPitch: { type: String, trim: true },
      },
    ],
    duplicateCheck: {
      isDuplicate: { type: Boolean, default: false, index: true },
      matchedClientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', default: null },
      matchedClientName: { type: String },
      matchReason: { type: String },
    },
    reviewStatus: {
      type: String,
      enum: ['staged', 'approved', 'rejected'],
      default: 'staged',
      index: true,
    },
    rejectionReason: { type: String, trim: true },
    promotedClientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

export const StagedProspect = model<IStagedProspect>('AgencyStagedProspect', stagedProspectSchema);
