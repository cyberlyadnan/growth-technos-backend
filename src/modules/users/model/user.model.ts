import { Schema, model, Document, Types } from 'mongoose';
import { UserRole, UserStatus } from '@core/constants';
import {
  auditSchemaFields,
  baseSchemaOptions,
  applySoftDeleteQuery,
} from '@core/schemas/base.schema';

export interface IUser extends Document {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  permissions: string[];
  status: UserStatus;
  avatar?: string;
  phone?: string;
  lastLoginAt?: Date;
  emailVerified: boolean;
  passwordChangedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.VIEWER,
      index: true,
    },
    permissions: [{ type: String }],
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING,
      index: true,
    },
    avatar: { type: String },
    phone: { type: String, trim: true },
    lastLoginAt: { type: Date },
    emailVerified: { type: Boolean, default: false },
    passwordChangedAt: { type: Date },
    ...auditSchemaFields,
  },
  baseSchemaOptions,
);

userSchema.virtual('fullName').get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

applySoftDeleteQuery(userSchema);

userSchema.index({ email: 1, isDeleted: 1 });
userSchema.index({ role: 1, status: 1 });

export const User = model<IUser>('User', userSchema);
