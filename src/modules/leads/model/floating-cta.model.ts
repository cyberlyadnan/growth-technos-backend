import { Schema, model, Document, Types } from 'mongoose';
import { CtaActionType, WidgetPosition } from '@core/constants/leads';
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

export interface IFloatingCta extends Document {
  id: string;
  name: string;
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

const floatingCtaSchema = new Schema<IFloatingCta>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    position: {
      type: String,
      enum: Object.values(WidgetPosition),
      default: WidgetPosition.BOTTOM_RIGHT,
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

floatingCtaSchema.index({ status: 1, priority: -1, isDeleted: 1 });

applySoftDeleteQuery(floatingCtaSchema);

export const FloatingCta = model<IFloatingCta>('FloatingCta', floatingCtaSchema);
