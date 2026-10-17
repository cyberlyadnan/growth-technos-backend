import { Types } from 'mongoose';
import { BadRequestError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import { UserRole } from '@core/constants';
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
  rewrapSecret,
} from '@core/security/vault-crypto';
import { AgencyClient } from '@modules/agency/clients/model/client.model';
import { allocateAgencyDocumentCode } from '@modules/agency/clients/service/number-sequence.service';
import { AgencyProject } from '@modules/agency/projects/model/project.model';
import { AgencyAsset } from '../model/asset.model';
import {
  AgencyCredential,
  CredentialSecretType,
  CredentialStatus,
  IAgencyCredential,
} from '../model/credential.model';
import { CredentialAudit, CredentialAuditAction } from '../model/credential-audit.model';
import { requirePasswordReauth } from './reauth.service';

type Filter = Record<string, unknown>;

export type CredentialActor = {
  id: string;
  role: UserRole | string;
  email?: string;
  fullName?: string;
};

export type RequestMeta = {
  ip?: string;
  userAgent?: string;
};

export type CreateCredentialDto = {
  clientId: string;
  projectId?: string | null;
  assetId?: string | null;
  label: string;
  username?: string;
  secretType: CredentialSecretType;
  /** Plaintext secret — never persisted; encrypted immediately. */
  secret: string;
  notes?: string;
  currentPassword: string;
};

export type UpdateCredentialMetaDto = {
  label?: string;
  username?: string;
  notes?: string;
  projectId?: string | null;
  assetId?: string | null;
};

export type UpdateCredentialSecretDto = {
  secret: string;
  currentPassword: string;
};

export type ListCredentialsQuery = PaginationQuery & {
  search?: string;
  clientId?: string;
  projectId?: string;
  assetId?: string;
  status?: CredentialStatus;
  secretType?: CredentialSecretType;
};

export class CredentialService {
  private async writeAudit(
    doc: IAgencyCredential,
    action: CredentialAuditAction,
    actor: CredentialActor,
    reqMeta?: RequestMeta,
    meta?: Record<string, unknown>,
  ) {
    await CredentialAudit.create({
      credentialId: doc._id,
      credentialCode: doc.code,
      clientId: doc.clientId,
      action,
      actorId: new Types.ObjectId(actor.id),
      actorEmail: actor.email,
      ip: reqMeta?.ip,
      userAgent: reqMeta?.userAgent,
      meta,
    });
  }

  private async getOrThrow(id: string, withCipher = false): Promise<IAgencyCredential> {
    let query = AgencyCredential.findById(id);
    if (withCipher) query = query.select('+cipher');
    const doc = await query.exec();
    if (!doc || doc.isDeleted) throw new NotFoundError('Credential');
    return doc;
  }

  private async assertClient(clientId: string) {
    const client = await AgencyClient.findById(clientId).exec();
    if (!client || client.isDeleted) throw new BadRequestError('Client not found');
    return client;
  }

  private async assertProject(projectId?: string | null, clientId?: string) {
    if (!projectId) return null;
    const project = await AgencyProject.findById(projectId).exec();
    if (!project || project.isDeleted) throw new BadRequestError('Project not found');
    if (clientId && String(project.clientId) !== clientId) {
      throw new BadRequestError('Project does not belong to the selected client');
    }
    return project;
  }

  private async assertAsset(assetId?: string | null, clientId?: string) {
    if (!assetId) return null;
    const asset = await AgencyAsset.findById(assetId).exec();
    if (!asset || asset.isDeleted) throw new BadRequestError('Asset not found');
    if (clientId && String(asset.clientId) !== clientId) {
      throw new BadRequestError('Asset does not belong to the selected client');
    }
    return asset;
  }

  /** Safe response — never includes cipher or plaintext. */
  private toSafeResponse(doc: IAgencyCredential, extras?: { clientName?: string; assetName?: string }) {
    return {
      id: doc.id,
      code: doc.code,
      clientId: String(doc.clientId),
      clientName: extras?.clientName,
      projectId: doc.projectId ? String(doc.projectId) : null,
      assetId: doc.assetId ? String(doc.assetId) : null,
      assetName: extras?.assetName,
      label: doc.label,
      username: doc.username,
      secretType: doc.secretType,
      maskedHint: doc.maskedHint,
      keyVersion: undefined as string | undefined,
      status: doc.status,
      notes: doc.notes,
      lastRevealedAt: doc.lastRevealedAt?.toISOString(),
      archivedAt: doc.archivedAt?.toISOString(),
      isActive: doc.isActive,
      isDeleted: doc.isDeleted,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      vaultConfigured: true,
    };
  }

  async list(
    query: ListCredentialsQuery,
    _actor: CredentialActor,
  ): Promise<{ items: ReturnType<CredentialService['toSafeResponse']>[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'updatedAt',
      order: query.order ?? 'desc',
    });

    const filter: Filter = { isDeleted: { $ne: true } };
    if (query.clientId) filter.clientId = new Types.ObjectId(query.clientId);
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.assetId) filter.assetId = new Types.ObjectId(query.assetId);
    if (query.status) filter.status = query.status;
    if (query.secretType) filter.secretType = query.secretType;
    Object.assign(filter, buildSearchFilter(query.search, ['label', 'username', 'code']));

    const [docs, total] = await Promise.all([
      AgencyCredential.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      AgencyCredential.countDocuments(filter),
    ]);

    return {
      items: docs.map((d) => this.toSafeResponse(d)),
      meta: buildPaginationMeta(total, page, limit) as PaginationMeta,
    };
  }

  async getById(id: string, _actor: CredentialActor) {
    const doc = await this.getOrThrow(id);
    return this.toSafeResponse(doc);
  }

  async create(dto: CreateCredentialDto, actor: CredentialActor, reqMeta?: RequestMeta) {
    await requirePasswordReauth(actor.id, dto.currentPassword);
    await this.assertClient(dto.clientId);
    await this.assertProject(dto.projectId, dto.clientId);
    await this.assertAsset(dto.assetId, dto.clientId);

    const cipher = encryptSecret(dto.secret);
    const code = await allocateAgencyDocumentCode('credential');

    const doc = await AgencyCredential.create({
      code,
      clientId: new Types.ObjectId(dto.clientId),
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      assetId: dto.assetId ? new Types.ObjectId(dto.assetId) : null,
      label: dto.label.trim(),
      username: dto.username?.trim(),
      secretType: dto.secretType,
      maskedHint: maskSecret(dto.secret),
      cipher,
      status: 'active',
      notes: dto.notes?.trim(),
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });

    await this.writeAudit(doc, 'created', actor, reqMeta, { keyVersion: cipher.keyVersion });
    loggers.security.info('Credential vault entry created', {
      credentialId: doc.id,
      code: doc.code,
      actorId: actor.id,
    });
    return this.toSafeResponse(doc);
  }

  async updateMetadata(
    id: string,
    dto: UpdateCredentialMetaDto,
    actor: CredentialActor,
    reqMeta?: RequestMeta,
  ) {
    const doc = await this.getOrThrow(id);
    if (doc.status === 'archived') throw new BadRequestError('Archived credentials cannot be edited');

    const clientId = String(doc.clientId);
    if (dto.projectId !== undefined) {
      await this.assertProject(dto.projectId, clientId);
      doc.projectId = dto.projectId ? new Types.ObjectId(dto.projectId) : null;
    }
    if (dto.assetId !== undefined) {
      await this.assertAsset(dto.assetId, clientId);
      doc.assetId = dto.assetId ? new Types.ObjectId(dto.assetId) : null;
    }
    if (dto.label !== undefined) doc.label = dto.label.trim();
    if (dto.username !== undefined) doc.username = dto.username?.trim();
    if (dto.notes !== undefined) doc.notes = dto.notes?.trim();
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    await this.writeAudit(doc, 'metadata_updated', actor, reqMeta);
    return this.toSafeResponse(doc);
  }

  async updateSecret(
    id: string,
    dto: UpdateCredentialSecretDto,
    actor: CredentialActor,
    reqMeta?: RequestMeta,
  ) {
    await requirePasswordReauth(actor.id, dto.currentPassword);
    const doc = await this.getOrThrow(id, true);
    if (doc.status === 'archived') throw new BadRequestError('Archived credentials cannot be edited');

    const cipher = encryptSecret(dto.secret);
    doc.cipher = cipher;
    doc.maskedHint = maskSecret(dto.secret);
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    await this.writeAudit(doc, 'secret_updated', actor, reqMeta, { keyVersion: cipher.keyVersion });
    loggers.security.info('Credential secret updated', { credentialId: doc.id, actorId: actor.id });
    return this.toSafeResponse(doc);
  }

  async reveal(
    id: string,
    currentPassword: string,
    actor: CredentialActor,
    reqMeta?: RequestMeta,
  ) {
    await requirePasswordReauth(actor.id, currentPassword);
    const doc = await this.getOrThrow(id, true);
    if (doc.status === 'archived') throw new BadRequestError('Archived credentials cannot be revealed');

    const plaintext = decryptSecret(doc.cipher);
    doc.lastRevealedAt = new Date();
    doc.lastRevealedBy = new Types.ObjectId(actor.id);
    await doc.save();
    await this.writeAudit(doc, 'revealed', actor, reqMeta, { keyVersion: doc.cipher.keyVersion });
    loggers.security.info('Credential revealed', { credentialId: doc.id, actorId: actor.id });
    const { activityService } = await import('@modules/agency/activity/service/activity.service');
    await activityService.record({
      actor: { id: actor.id, fullName: actor.fullName },
      action: 'credential_accessed',
      entityType: 'credential',
      entityId: doc.id,
      entityCode: doc.code,
      clientId: doc.clientId ? String(doc.clientId) : null,
      projectId: doc.projectId ? String(doc.projectId) : null,
      message: `Credential accessed: ${doc.code}`,
      meta: { secretType: doc.secretType, keyVersion: doc.cipher.keyVersion },
    });

    return {
      id: doc.id,
      code: doc.code,
      label: doc.label,
      username: doc.username,
      secretType: doc.secretType,
      /** One-time reveal payload — do not cache client-side longer than needed. */
      secret: plaintext,
      revealedAt: new Date().toISOString(),
    };
  }

  async rewrap(id: string, currentPassword: string, actor: CredentialActor, reqMeta?: RequestMeta) {
    await requirePasswordReauth(actor.id, currentPassword);
    const doc = await this.getOrThrow(id, true);
    const previousVersion = doc.cipher.keyVersion;
    const cipher = rewrapSecret(doc.cipher);
    doc.cipher = cipher;
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    await this.writeAudit(doc, 'rewrapped', actor, reqMeta, {
      fromKeyVersion: previousVersion,
      toKeyVersion: cipher.keyVersion,
    });
    return this.toSafeResponse(doc);
  }

  async archive(id: string, actor: CredentialActor, reqMeta?: RequestMeta) {
    const doc = await this.getOrThrow(id);
    if (doc.status === 'archived') throw new BadRequestError('Already archived');
    doc.status = 'archived';
    doc.archivedAt = new Date();
    doc.isActive = false;
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    await this.writeAudit(doc, 'archived', actor, reqMeta);
    return this.toSafeResponse(doc);
  }

  async restore(id: string, actor: CredentialActor, reqMeta?: RequestMeta) {
    const doc = await this.getOrThrow(id);
    if (doc.status !== 'archived') throw new BadRequestError('Credential is not archived');
    doc.status = 'active';
    doc.archivedAt = undefined;
    doc.isActive = true;
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    await this.writeAudit(doc, 'restored', actor, reqMeta);
    return this.toSafeResponse(doc);
  }

  async remove(id: string, currentPassword: string, actor: CredentialActor, reqMeta?: RequestMeta) {
    await requirePasswordReauth(actor.id, currentPassword);
    const doc = await this.getOrThrow(id, true);
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.isActive = false;
    doc.status = 'archived';
    doc.updatedBy = new Types.ObjectId(actor.id);
    // Wipe cipher material on controlled deletion
    doc.cipher = {
      algorithm: 'aes-256-gcm',
      keyVersion: 'deleted',
      ciphertext: '',
      iv: '',
      authTag: '',
    };
    doc.maskedHint = '••••deleted';
    await doc.save();
    await this.writeAudit(doc, 'deleted', actor, reqMeta);
    loggers.security.info('Credential soft-deleted and cipher cleared', {
      credentialId: doc.id,
      actorId: actor.id,
    });
  }

  async listAudit(credentialId: string, query: PaginationQuery) {
    await this.getOrThrow(credentialId);
    const { page, limit, skip } = parsePaginationQuery(query);
    const filter = { credentialId: new Types.ObjectId(credentialId) };
    const [items, total] = await Promise.all([
      CredentialAudit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      CredentialAudit.countDocuments(filter),
    ]);
    return {
      items: items.map((a) => ({
        id: String(a._id),
        action: a.action,
        actorEmail: a.actorEmail,
        ip: a.ip,
        meta: a.meta,
        createdAt: a.createdAt.toISOString(),
      })),
      meta: buildPaginationMeta(total, page, limit) as PaginationMeta,
    };
  }
}

export const credentialService = new CredentialService();
