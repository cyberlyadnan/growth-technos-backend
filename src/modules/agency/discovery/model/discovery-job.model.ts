import { Schema, model, Document, Types } from 'mongoose';

export type DiscoveryJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type DiscoverySource = 'serper' | 'tinyfish' | 'scavio_maps' | 'scavio_search' | 'osm' | 'multi_source';

export interface IDiscoveryJobConfig {
  industry: string;
  targetLocation: string;
  companyCategory?: string;
  companySizeRange?: string;
  websiteAvailability?: 'any' | 'with_website' | 'without_website';
  discoverySource: DiscoverySource;
  limit: number;
  additionalKeywords?: string[];
}

export interface IDiscoveryJobStats {
  discoveredCount: number;
  duplicateCount: number;
  researchedCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export interface IDiscoveryJob extends Document {
  id: string;
  jobId: string;
  status: DiscoveryJobStatus;
  config: IDiscoveryJobConfig;
  stats: IDiscoveryJobStats;
  progressPercent: number;
  currentStepMessage: string;
  errorMessage?: string;
  pid?: number | null;
  startedAt: Date;
  completedAt?: Date;
  createdBy?: Types.ObjectId | null;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const discoveryJobConfigSchema = new Schema<IDiscoveryJobConfig>(
  {
    industry: { type: String, required: true, trim: true },
    targetLocation: { type: String, required: true, trim: true },
    companyCategory: { type: String, trim: true },
    companySizeRange: { type: String, trim: true },
    websiteAvailability: {
      type: String,
      enum: ['any', 'with_website', 'without_website'],
      default: 'any',
    },
    discoverySource: {
      type: String,
      enum: ['serper', 'tinyfish', 'scavio_maps', 'scavio_search', 'osm', 'multi_source'],
      default: 'serper',
    },
    limit: { type: Number, default: 10, min: 1, max: 50 },
    additionalKeywords: [{ type: String, trim: true }],
  },
  { _id: false },
);

const discoveryJobStatsSchema = new Schema<IDiscoveryJobStats>(
  {
    discoveredCount: { type: Number, default: 0 },
    duplicateCount: { type: Number, default: 0 },
    researchedCount: { type: Number, default: 0 },
    approvedCount: { type: Number, default: 0 },
    rejectedCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const discoveryJobSchema = new Schema<IDiscoveryJob>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    config: { type: discoveryJobConfigSchema, required: true },
    stats: { type: discoveryJobStatsSchema, default: () => ({}) },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    currentStepMessage: { type: String, default: 'Initializing job...', trim: true },
    errorMessage: { type: String, trim: true },
    pid: { type: Number, default: null },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdByName: { type: String, trim: true },
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

discoveryJobSchema.index({ status: 1, createdAt: -1 });

export const DiscoveryJob = model<IDiscoveryJob>('DiscoveryJob', discoveryJobSchema);

