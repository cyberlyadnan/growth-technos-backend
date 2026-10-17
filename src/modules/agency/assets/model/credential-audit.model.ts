import { Schema, model, Document, Types } from 'mongoose';

/**
 * Audit of credential vault access/changes.
 * Never store plaintext secrets or ciphertext here.
 */
export type CredentialAuditAction =
  | 'created'
  | 'metadata_updated'
  | 'secret_updated'
  | 'revealed'
  | 'rewrapped'
  | 'archived'
  | 'restored'
  | 'deleted';

export interface ICredentialAudit extends Document {
  id: string;
  credentialId: Types.ObjectId;
  credentialCode: string;
  clientId: Types.ObjectId;
  action: CredentialAuditAction;
  actorId: Types.ObjectId;
  actorEmail?: string;
  ip?: string;
  userAgent?: string;
  /** Safe metadata only (e.g. keyVersion after rewrap). */
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const credentialAuditSchema = new Schema<ICredentialAudit>(
  {
    credentialId: {
      type: Schema.Types.ObjectId,
      ref: 'AgencyCredential',
      required: true,
      index: true,
    },
    credentialCode: { type: String, required: true, trim: true, maxlength: 40 },
    clientId: { type: Schema.Types.ObjectId, ref: 'AgencyClient', required: true, index: true },
    action: {
      type: String,
      enum: [
        'created',
        'metadata_updated',
        'secret_updated',
        'revealed',
        'rewrapped',
        'archived',
        'restored',
        'deleted',
      ],
      required: true,
      index: true,
    },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorEmail: { type: String, trim: true, maxlength: 200 },
    ip: { type: String, trim: true, maxlength: 80 },
    userAgent: { type: String, trim: true, maxlength: 400 },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

credentialAuditSchema.index({ createdAt: -1 });

export const CredentialAudit = model<ICredentialAudit>('CredentialAudit', credentialAuditSchema);
