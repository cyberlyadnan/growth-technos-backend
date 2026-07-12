import { Schema, model, Document, Types } from 'mongoose';
import { CtaActionType, CtaPlacement, WidgetPosition } from '@core/constants/leads';
import {
  EntityStatus,
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
  publishStatusField,
} from '@core/schemas/base.schema';
import {
  ICtaAction,
  IDisplayRules,
  IFrequencyControl,
  defaultDisplayRules,
  ctaActionSchema,
  displayRulesSchema,
  frequencyControlSchema,
} from '@core/schemas/lead-gen.schema';

export interface IStickyCtaCampaign extends Document {
  id: string;
  name: string;
  placement: CtaPlacement;
  position: WidgetPosition;
  ctaAction: ICtaAction;
  showOnMobile: boolean;
  showOnDesktop: boolean;
  displayRules: IDisplayRules;
  frequencyControl: IFrequencyControl;
  priority: number;
  campaignId?: Types.ObjectId | null;
  status: EntityStatus;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stickyCtaCampaignSchema = new Schema<IStickyCtaCampaign>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    placement: {
      type: String,
      enum: Object.values(CtaPlacement),
      default: CtaPlacement.STICKY_BAR,
    },
    position: {
      type: String,
      enum: Object.values(WidgetPosition),
      default: WidgetPosition.BOTTOM_BAR,
    },
    ctaAction: {
      type: ctaActionSchema,
      default: () => ({ type: CtaActionType.LINK }),
    },
    showOnMobile: { type: Boolean, default: true },
    showOnDesktop: { type: Boolean, default: true },
    displayRules: { type: displayRulesSchema, default: defaultDisplayRules },
    frequencyControl: { type: frequencyControlSchema, default: () => ({}) },
    priority: { type: Number, default: 0, min: 0, max: 1000, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', default: null },
    ...publishStatusField,
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

stickyCtaCampaignSchema.index({ status: 1, priority: -1, isDeleted: 1 });

applySoftDeleteQuery(stickyCtaCampaignSchema);

export const StickyCtaCampaign = model<IStickyCtaCampaign>(
  'StickyCtaCampaign',
  stickyCtaCampaignSchema,
);
