import { Schema, model, Document, Types } from 'mongoose';
import { CtaActionType } from '@core/constants/leads';
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
  IImageAsset,
  defaultDisplayRules,
  ctaActionSchema,
  displayRulesSchema,
  imageAssetSchema,
} from '@core/schemas/lead-gen.schema';

export interface ILeadMagnet extends Document {
  id: string;
  title: string;
  description?: string;
  value?: string;
  benefits: string[];
  icon?: string;
  image?: IImageAsset | null;
  ctaAction: ICtaAction;
  landingUrl?: string;
  formId?: Types.ObjectId | null;
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

const leadMagnetSchema = new Schema<ILeadMagnet>(
  {
    title: { type: String, required: true, trim: true, maxlength: 220 },
    description: { type: String, trim: true, maxlength: 3000 },
    value: { type: String, trim: true, maxlength: 120 },
    benefits: [{ type: String, trim: true, maxlength: 300 }],
    icon: { type: String, trim: true, maxlength: 80 },
    image: { type: imageAssetSchema, default: null },
    ctaAction: {
      type: ctaActionSchema,
      default: () => ({ type: CtaActionType.FORM }),
    },
    landingUrl: { type: String, trim: true, maxlength: 2000 },
    formId: { type: Schema.Types.ObjectId, ref: 'LeadForm', default: null },
    displayRules: { type: displayRulesSchema, default: defaultDisplayRules },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', default: null },
    ...publishStatusField,
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

leadMagnetSchema.index({ status: 1, isDeleted: 1 });
leadMagnetSchema.index({ 'displayRules.priority': -1, status: 1 });

applySoftDeleteQuery(leadMagnetSchema);

export const LeadMagnet = model<ILeadMagnet>('LeadMagnet', leadMagnetSchema);
