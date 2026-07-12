import { Schema, model, Document, Types } from 'mongoose';
import { CtaActionType, OfferType } from '@core/constants/leads';
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
  defaultDisplayRules,
  ctaActionSchema,
  displayRulesSchema,
} from '@core/schemas/lead-gen.schema';

export interface IOffer extends Document {
  id: string;
  title: string;
  description?: string;
  offerType: OfferType;
  valueLabel?: string;
  bannerText?: string;
  countdownEnabled: boolean;
  expiresAt?: Date | null;
  ctaAction: ICtaAction;
  applicableIndustries: string[];
  applicableServices: string[];
  displayRules: IDisplayRules;
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

const offerSchema = new Schema<IOffer>(
  {
    title: { type: String, required: true, trim: true, maxlength: 220 },
    description: { type: String, trim: true, maxlength: 3000 },
    offerType: {
      type: String,
      enum: Object.values(OfferType),
      default: OfferType.CUSTOM,
      index: true,
    },
    valueLabel: { type: String, trim: true, maxlength: 120 },
    bannerText: { type: String, trim: true, maxlength: 300 },
    countdownEnabled: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
    ctaAction: {
      type: ctaActionSchema,
      default: () => ({ type: CtaActionType.LINK }),
    },
    applicableIndustries: [{ type: String, trim: true }],
    applicableServices: [{ type: String, trim: true }],
    displayRules: { type: displayRulesSchema, default: defaultDisplayRules },
    priority: { type: Number, default: 0, min: 0, max: 1000, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', default: null },
    ...publishStatusField,
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

offerSchema.index({ status: 1, priority: -1, isDeleted: 1 });
offerSchema.index({ expiresAt: 1, status: 1 });

applySoftDeleteQuery(offerSchema);

export const Offer = model<IOffer>('Offer', offerSchema);
