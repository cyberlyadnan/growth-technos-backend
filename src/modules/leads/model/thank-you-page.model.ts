import { Schema, model, Document, Types } from 'mongoose';
import { ThankYouPageType } from '@core/constants/leads';
import {
  EntityStatus,
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
  publishStatusField,
} from '@core/schemas/base.schema';
import { ISeoFields, seoSchemaFields } from '@core/schemas/seo.schema';
import {
  IResourceLink,
  resourceLinkSchema,
} from '@core/schemas/lead-gen.schema';

export interface IThankYouNextStep {
  title: string;
  description?: string;
  order: number;
}

export interface IThankYouPage extends Document, ISeoFields {
  id: string;
  type: ThankYouPageType;
  headline: string;
  body?: string;
  nextSteps: IThankYouNextStep[];
  timelineText?: string;
  downloadLinks: IResourceLink[];
  relatedResources: IResourceLink[];
  calendarEmbedUrl?: string;
  status: EntityStatus;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const thankYouNextStepSchema = new Schema<IThankYouNextStep>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    order: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const thankYouPageSchema = new Schema<IThankYouPage>(
  {
    ...seoSchemaFields,
    type: {
      type: String,
      enum: Object.values(ThankYouPageType),
      default: ThankYouPageType.GENERIC,
      index: true,
    },
    headline: { type: String, required: true, trim: true, maxlength: 220 },
    body: { type: String, trim: true, maxlength: 5000 },
    nextSteps: { type: [thankYouNextStepSchema], default: [] },
    timelineText: { type: String, trim: true, maxlength: 500 },
    downloadLinks: { type: [resourceLinkSchema], default: [] },
    relatedResources: { type: [resourceLinkSchema], default: [] },
    calendarEmbedUrl: { type: String, trim: true, maxlength: 2000 },
    ...publishStatusField,
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

thankYouPageSchema.index({ slug: 1, isDeleted: 1 }, { unique: true });
thankYouPageSchema.index({ status: 1, type: 1, isDeleted: 1 });

applySoftDeleteQuery(thankYouPageSchema);

export const ThankYouPage = model<IThankYouPage>('ThankYouPage', thankYouPageSchema);
