import { Schema, model, Document, Types } from 'mongoose';
import {
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
} from '@core/schemas/base.schema';

export interface ITopicCluster extends Document {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const topicClusterSchema = new Schema<ITopicCluster>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true, index: true },
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

applySoftDeleteQuery(topicClusterSchema);

topicClusterSchema.index({ slug: 1, isDeleted: 1 }, { unique: true });

export const TopicCluster = model<ITopicCluster>('TopicCluster', topicClusterSchema);
