import { Schema, model, Document } from 'mongoose';
import { Permission } from '@core/constants';

export interface IRole extends Document {
  name: string;
  slug: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, trim: true },
    permissions: [{ type: String, enum: Object.values(Permission) }],
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Role = model<IRole>('Role', roleSchema);
