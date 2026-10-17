import { Schema, model, Document, Types } from 'mongoose';
import {
  agencyAuditFields,
  agencySchemaOptions,
} from '../../schemas/agency-base.schema';
import { applySoftDeleteQuery } from '@core/schemas/base.schema';
import { VAULT_ALGORITHM } from '@core/security/vault-crypto';

export type CredentialSecretType = 'password' | 'api_key' | 'access_token' | 'other';

export type CredentialStatus = 'active' | 'archived';

/** Ciphertext-only fields — never log or return these except via controlled decrypt. */
export interface ICredentialCipher {
  algorithm: typeof VAULT_ALGORITHM;
  keyVersion: string;
  ciphertext: string;
  iv: string;
  authTag: string;
}

export interface IAgencyCredential extends Document {
  id: string;
  code: string;
  clientId: Types.ObjectId;
  projectId?: Types.ObjectId | null;
  assetId?: Types.ObjectId | null;
  label: string;
  username?: string;
  secretType: CredentialSecretType;
  /** Masked hint only (derived at write time). */
  maskedHint: string;
  cipher: ICredentialCipher;
  status: CredentialStatus;
  notes?: string;
  lastRevealedAt?: Date;
  lastRevealedBy?: Types.ObjectId;
  archivedAt?: Date;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const cipherSchema = new Schema<ICredentialCipher>(
  {
    algorithm: { type: String, required: true, enum: [VAULT_ALGORITHM] },
    keyVersion: { type: String, required: true, trim: true, maxlength: 40 },
    ciphertext: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
  },
  { _id: false },
);

const credentialSchema = new Schema<IAgencyCredential>(
  {
    code: { type: String, required: true, unique: true, trim: true, maxlength: 40, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'AgencyProject', default: null, index: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'AgencyAsset', default: null, index: true },
    label: { type: String, required: true, trim: true, maxlength: 200 },
    username: { type: String, trim: true, maxlength: 200 },
    secretType: {
      type: String,
      enum: ['password', 'api_key', 'access_token', 'other'],
      required: true,
      index: true,
    },
    maskedHint: { type: String, required: true, maxlength: 40 },
    cipher: { type: cipherSchema, required: true, select: false },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
    notes: { type: String, trim: true, maxlength: 2000 },
    lastRevealedAt: { type: Date },
    lastRevealedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    archivedAt: { type: Date },
    ...agencyAuditFields,
  },
  agencySchemaOptions,
);

applySoftDeleteQuery(credentialSchema);

credentialSchema.index({ clientId: 1, status: 1 });
credentialSchema.index({ assetId: 1, status: 1 });

export const AgencyCredential = model<IAgencyCredential>('AgencyCredential', credentialSchema);
