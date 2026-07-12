import { Schema, model, Document, Types } from 'mongoose';
import { FormFieldType } from '@core/constants/leads';
import { EntityStatus } from '@core/schemas/base.schema';
import {
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
  publishStatusField,
} from '@core/schemas/base.schema';
import {
  IDisplayRules,
  IMicrocopy,
  IRedirectRules,
  defaultDisplayRules,
  displayRulesSchema,
  microcopySchema,
  redirectRulesSchema,
} from '@core/schemas/lead-gen.schema';

export interface ILeadFormField {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[];
  order: number;
  placeholder?: string;
  helpText?: string;
  step?: number;
  defaultValue?: string;
}

export interface ILeadForm extends Document {
  id: string;
  name: string;
  slug: string;
  title?: string;
  description?: string;
  fields: ILeadFormField[];
  microcopy: IMicrocopy;
  successMessageId?: Types.ObjectId | null;
  thankYouPageId?: Types.ObjectId | null;
  redirectRules: IRedirectRules;
  honeypotEnabled: boolean;
  displayRules: IDisplayRules;
  status: EntityStatus;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const leadFormFieldSchema = new Schema<ILeadFormField>(
  {
    key: { type: String, required: true, trim: true, maxlength: 80 },
    label: { type: String, required: true, trim: true, maxlength: 160 },
    type: {
      type: String,
      enum: Object.values(FormFieldType),
      required: true,
    },
    required: { type: Boolean, default: false },
    options: [{ type: String, trim: true }],
    order: { type: Number, default: 0, min: 0 },
    placeholder: { type: String, trim: true, maxlength: 200 },
    helpText: { type: String, trim: true, maxlength: 500 },
    step: { type: Number, min: 1, max: 20 },
    defaultValue: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
);

const leadFormSchema = new Schema<ILeadForm>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 220,
      index: true,
    },
    title: { type: String, trim: true, maxlength: 220 },
    description: { type: String, trim: true, maxlength: 2000 },
    fields: { type: [leadFormFieldSchema], default: [] },
    microcopy: { type: microcopySchema, default: () => ({}) },
    successMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'SuccessMessage',
      default: null,
    },
    thankYouPageId: {
      type: Schema.Types.ObjectId,
      ref: 'ThankYouPage',
      default: null,
    },
    redirectRules: {
      type: redirectRulesSchema,
      default: () => ({ mode: 'none' as const }),
    },
    honeypotEnabled: { type: Boolean, default: true },
    displayRules: { type: displayRulesSchema, default: defaultDisplayRules },
    ...publishStatusField,
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

leadFormSchema.index({ status: 1, isDeleted: 1 });
leadFormSchema.index({ slug: 1, isDeleted: 1 }, { unique: true });
leadFormSchema.index({ 'displayRules.priority': -1, status: 1 });

applySoftDeleteQuery(leadFormSchema);

export const LeadForm = model<ILeadForm>('LeadForm', leadFormSchema);
