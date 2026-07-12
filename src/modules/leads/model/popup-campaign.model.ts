import { Schema, model, Document, Types } from 'mongoose';
import { PopupTrigger } from '@core/constants/leads';
import {
  EntityStatus,
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
  publishStatusField,
} from '@core/schemas/base.schema';
import {
  IDisplayRules,
  IFrequencyControl,
  defaultDisplayRules,
  displayRulesSchema,
  frequencyControlSchema,
} from '@core/schemas/lead-gen.schema';

export interface IPopupTriggerConfig {
  scrollPercentage?: number;
  delayMs?: number;
  buttonSelector?: string;
}

export interface IPopupContent {
  headline?: string;
  body?: string;
  formId?: Types.ObjectId | null;
  offerId?: Types.ObjectId | null;
  magnetId?: Types.ObjectId | null;
  imageUrl?: string;
}

export interface IPopupCampaign extends Document {
  id: string;
  name: string;
  trigger: PopupTrigger;
  triggerConfig: IPopupTriggerConfig;
  content: IPopupContent;
  frequencyControl: IFrequencyControl;
  displayRules: IDisplayRules;
  campaignId?: Types.ObjectId | null;
  status: EntityStatus;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const popupCampaignSchema = new Schema<IPopupCampaign>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    trigger: {
      type: String,
      enum: Object.values(PopupTrigger),
      default: PopupTrigger.TIME_DELAY,
      index: true,
    },
    triggerConfig: {
      scrollPercentage: { type: Number, min: 0, max: 100 },
      delayMs: { type: Number, min: 0, max: 600000 },
      buttonSelector: { type: String, trim: true, maxlength: 200 },
    },
    content: {
      headline: { type: String, trim: true, maxlength: 220 },
      body: { type: String, trim: true, maxlength: 3000 },
      formId: { type: Schema.Types.ObjectId, ref: 'LeadForm', default: null },
      offerId: { type: Schema.Types.ObjectId, ref: 'Offer', default: null },
      magnetId: { type: Schema.Types.ObjectId, ref: 'LeadMagnet', default: null },
      imageUrl: { type: String, trim: true, maxlength: 2000 },
    },
    frequencyControl: { type: frequencyControlSchema, default: () => ({}) },
    displayRules: { type: displayRulesSchema, default: defaultDisplayRules },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', default: null },
    ...publishStatusField,
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

popupCampaignSchema.index({ status: 1, isDeleted: 1 });
popupCampaignSchema.index({ 'displayRules.priority': -1, status: 1 });

applySoftDeleteQuery(popupCampaignSchema);

export const PopupCampaign = model<IPopupCampaign>('PopupCampaign', popupCampaignSchema);
