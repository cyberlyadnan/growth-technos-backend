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
  defaultDisplayRules,
  ctaActionSchema,
  displayRulesSchema,
} from '@core/schemas/lead-gen.schema';

export interface IWhatsAppWidget extends Document {
  id: string;
  name: string;
  position: WidgetPosition;
  headline?: string;
  prefilledMessage?: string;
  whatsappNumber: string;
  hoursNote?: string;
  ctaAction: ICtaAction;
  displayRules: IDisplayRules;
  priority: number;
  status: EntityStatus;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const whatsappWidgetSchema = new Schema<IWhatsAppWidget>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    position: {
      type: String,
      enum: Object.values(WidgetPosition),
      default: WidgetPosition.BOTTOM_RIGHT,
    },
    headline: { type: String, trim: true, maxlength: 160 },
    prefilledMessage: { type: String, trim: true, maxlength: 500 },
    whatsappNumber: { type: String, required: true, trim: true, maxlength: 40 },
    hoursNote: { type: String, trim: true, maxlength: 300 },
    ctaAction: {
      type: ctaActionSchema,
      default: () => ({ type: CtaActionType.WHATSAPP }),
    },
    displayRules: { type: displayRulesSchema, default: defaultDisplayRules },
    priority: { type: Number, default: 0, min: 0, max: 1000, index: true },
    ...publishStatusField,
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

whatsappWidgetSchema.index({ status: 1, priority: -1, isDeleted: 1 });

applySoftDeleteQuery(whatsappWidgetSchema);

export const WhatsAppWidget = model<IWhatsAppWidget>('WhatsAppWidget', whatsappWidgetSchema);
