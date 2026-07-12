import { Schema, model, Document, Types } from 'mongoose';
import {
  EntityStatus,
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
  publishStatusField,
} from '@core/schemas/base.schema';
import { ICtaAction, ctaActionSchema } from '@core/schemas/lead-gen.schema';

export interface ISuccessMessage extends Document {
  id: string;
  name: string;
  headline: string;
  body?: string;
  secondaryCta?: ICtaAction | null;
  status: EntityStatus;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const successMessageSchema = new Schema<ISuccessMessage>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    headline: { type: String, required: true, trim: true, maxlength: 220 },
    body: { type: String, trim: true, maxlength: 3000 },
    secondaryCta: { type: ctaActionSchema, default: undefined },
    ...publishStatusField,
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

successMessageSchema.index({ status: 1, isDeleted: 1 });
successMessageSchema.index({ name: 1, isDeleted: 1 });

applySoftDeleteQuery(successMessageSchema);

export const SuccessMessage = model<ISuccessMessage>('SuccessMessage', successMessageSchema);
