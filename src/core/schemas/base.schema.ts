import mongoose, { Schema, Document, Types } from 'mongoose';

export enum EntityStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export interface IBaseDocument extends Document {
  status: EntityStatus;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const auditSchemaFields = {
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
};

export const publishStatusField = {
  status: {
    type: String,
    enum: Object.values(EntityStatus),
    default: EntityStatus.DRAFT,
    index: true,
  },
};

export const baseSchemaFields = {
  ...publishStatusField,
  ...auditSchemaFields,
};

export const baseSchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: { virtuals: true },
};

export function applySoftDeleteQuery(schema: Schema): void {
  schema.pre(/^find/, function (this: mongoose.Query<unknown, unknown>) {
    if (!this.getOptions().includeDeleted) {
      this.where({ isDeleted: { $ne: true } });
    }
  });
}
