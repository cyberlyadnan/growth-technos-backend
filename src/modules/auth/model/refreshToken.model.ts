import { Schema, model, Document, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  userId: Types.ObjectId;
  token: string;
  family: string;
  isRevoked: boolean;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    isRevoked: { type: Boolean, default: false, index: true },
    // TTL index — documents are removed when expiresAt is reached (expireAfterSeconds: 0)
    expiresAt: { type: Date, required: true, expires: 0 },
    userAgent: { type: String },
    ip: { type: String },
  },
  { timestamps: true },
);

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
