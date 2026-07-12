import { Schema, model, Document, Types } from 'mongoose';
import { CampaignStatus } from '@core/constants/leads';
import {
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
} from '@core/schemas/base.schema';
import { IUtmFields, utmFieldsSchema } from '@core/schemas/lead-gen.schema';

export interface ICampaign extends Document {
  id: string;
  name: string;
  slug: string;
  status: CampaignStatus;
  startsAt?: Date | null;
  endsAt?: Date | null;
  defaultUtm: IUtmFields;
  formIds: Types.ObjectId[];
  offerIds: Types.ObjectId[];
  magnetIds: Types.ObjectId[];
  notes?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 220,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CampaignStatus),
      default: CampaignStatus.DRAFT,
      index: true,
    },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    defaultUtm: { type: utmFieldsSchema, default: () => ({}) },
    formIds: [{ type: Schema.Types.ObjectId, ref: 'LeadForm' }],
    offerIds: [{ type: Schema.Types.ObjectId, ref: 'Offer' }],
    magnetIds: [{ type: Schema.Types.ObjectId, ref: 'LeadMagnet' }],
    notes: { type: String, trim: true, maxlength: 5000 },
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

campaignSchema.index({ slug: 1, isDeleted: 1 }, { unique: true });
campaignSchema.index({ status: 1, startsAt: 1, endsAt: 1 });

applySoftDeleteQuery(campaignSchema);

export const Campaign = model<ICampaign>('Campaign', campaignSchema);
