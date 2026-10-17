import { Types } from 'mongoose';
import { Response } from 'express';
import { BadRequestError, NotFoundError } from '@core/errors';
import { agencyPrivateStorage } from '@core/storage/agency-private.storage';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import { UserRole } from '@core/constants';
import { AgencyClient } from '@modules/agency/clients/model/client.model';
import { allocateAgencyDocumentCode } from '@modules/agency/clients/service/number-sequence.service';
import { AgencyProject } from '@modules/agency/projects/model/project.model';
import { activityService } from '@modules/agency/activity/service/activity.service';
import {
  AgencyDocument,
  DocumentCategory,
  IAgencyDocument,
} from '../model/document.model';

export type DocumentActor = {
  id: string;
  role: UserRole | string;
  email?: string;
  fullName?: string;
};

export type ListDocumentsQuery = PaginationQuery & {
  search?: string;
  clientId?: string;
  projectId?: string;
  category?: DocumentCategory;
  handoverId?: string;
};

export class DocumentService {
  private async getOrThrow(id: string, withStorage = false): Promise<IAgencyDocument> {
    let q = AgencyDocument.findById(id);
    if (withStorage) q = q.select('+storageKey');
    const doc = await q.exec();
    if (!doc || doc.isDeleted) throw new NotFoundError('Document');
    return doc;
  }

  private toResponse(doc: IAgencyDocument, extras?: { clientName?: string; projectName?: string }) {
    return {
      id: doc.id,
      code: doc.code,
      title: doc.title,
      category: doc.category,
      clientId: String(doc.clientId),
      clientName: extras?.clientName,
      projectId: doc.projectId ? String(doc.projectId) : null,
      projectName: extras?.projectName,
      handoverId: doc.handoverId ? String(doc.handoverId) : null,
      description: doc.description,
      originalFileName: doc.originalFileName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      uploadedByName: doc.uploadedByName,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      /** Downloads require authenticated GET …/download — no public URL */
      downloadPath: `/agency/documents/${doc.id}/download`,
    };
  }

  async list(
    query: ListDocumentsQuery,
  ): Promise<{ items: ReturnType<DocumentService['toResponse']>[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'createdAt',
      order: query.order ?? 'desc',
    });
    const filter: Record<string, unknown> = {
      isDeleted: { $ne: true },
      ...buildSearchFilter(query.search, ['code', 'title', 'originalFileName', 'description']),
    };
    if (query.clientId) filter.clientId = new Types.ObjectId(query.clientId);
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.category) filter.category = query.category;
    if (query.handoverId) filter.handoverId = new Types.ObjectId(query.handoverId);

    const [docs, total] = await Promise.all([
      AgencyDocument.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      AgencyDocument.countDocuments(filter),
    ]);
    const clientIds = [...new Set(docs.map((d) => String(d.clientId)))];
    const projectIds = [
      ...new Set(docs.filter((d) => d.projectId).map((d) => String(d.projectId))),
    ];
    const [clients, projects] = await Promise.all([
      AgencyClient.find({ _id: { $in: clientIds } }).select('name').exec(),
      projectIds.length
        ? AgencyProject.find({ _id: { $in: projectIds } }).select('name').exec()
        : Promise.resolve([]),
    ]);
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));
    return {
      items: docs.map((d) =>
        this.toResponse(d, {
          clientName: clientMap.get(String(d.clientId)),
          projectName: d.projectId ? projectMap.get(String(d.projectId)) : undefined,
        }),
      ),
      meta: buildPaginationMeta(total, page, limit) as PaginationMeta,
    };
  }

  async getById(id: string) {
    const doc = await this.getOrThrow(id);
    const [client, project] = await Promise.all([
      AgencyClient.findById(doc.clientId).select('name').exec(),
      doc.projectId ? AgencyProject.findById(doc.projectId).select('name').exec() : null,
    ]);
    return this.toResponse(doc, { clientName: client?.name, projectName: project?.name });
  }

  async upload(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    meta: {
      title: string;
      category: DocumentCategory;
      clientId: string;
      projectId?: string | null;
      handoverId?: string | null;
      description?: string;
    },
    actor: DocumentActor,
  ) {
    const client = await AgencyClient.findById(meta.clientId).exec();
    if (!client || client.isDeleted) throw new BadRequestError('Client not found');
    if (meta.projectId) {
      const project = await AgencyProject.findById(meta.projectId).exec();
      if (!project || project.isDeleted) throw new BadRequestError('Project not found');
      if (String(project.clientId) !== meta.clientId) {
        throw new BadRequestError('Project does not belong to the selected client');
      }
    }

    const stored = await agencyPrivateStorage.store(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
    const code = await allocateAgencyDocumentCode('document');
    const doc = await AgencyDocument.create({
      code,
      title: meta.title.trim(),
      category: meta.category,
      clientId: new Types.ObjectId(meta.clientId),
      projectId: meta.projectId ? new Types.ObjectId(meta.projectId) : null,
      handoverId: meta.handoverId ? new Types.ObjectId(meta.handoverId) : null,
      description: meta.description?.trim(),
      originalFileName: stored.originalName,
      mimeType: stored.mimeType,
      sizeBytes: stored.size,
      storageKey: stored.storageKey,
      uploadedBy: new Types.ObjectId(actor.id),
      uploadedByName: actor.fullName || actor.email,
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });

    await activityService.record({
      actor,
      action: 'document_uploaded',
      entityType: 'document',
      entityId: doc.id,
      entityCode: doc.code,
      clientId: meta.clientId,
      projectId: meta.projectId,
      message: `Document uploaded: ${doc.title} (${doc.category})`,
      meta: { category: doc.category, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes },
    });

    return this.toResponse(doc);
  }

  async updateMeta(
    id: string,
    dto: { title?: string; description?: string; category?: DocumentCategory },
    actor: DocumentActor,
  ) {
    const doc = await this.getOrThrow(id);
    if (dto.title !== undefined) doc.title = dto.title.trim();
    if (dto.description !== undefined) doc.description = dto.description?.trim();
    if (dto.category !== undefined) doc.category = dto.category;
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    await activityService.record({
      actor,
      action: 'document_updated',
      entityType: 'document',
      entityId: doc.id,
      entityCode: doc.code,
      clientId: String(doc.clientId),
      projectId: doc.projectId ? String(doc.projectId) : null,
      message: `Document metadata updated: ${doc.code}`,
    });
    return this.toResponse(doc);
  }

  async remove(id: string, actor: DocumentActor) {
    const doc = await this.getOrThrow(id, true);
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.isActive = false;
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    // Soft-delete keeps file for audit; hard purge optional later
    await activityService.record({
      actor,
      action: 'document_deleted',
      entityType: 'document',
      entityId: doc.id,
      entityCode: doc.code,
      clientId: String(doc.clientId),
      projectId: doc.projectId ? String(doc.projectId) : null,
      message: `Document moved to trash: ${doc.code}`,
    });
  }

  async streamDownload(id: string, res: Response, actor: DocumentActor) {
    const doc = await this.getOrThrow(id, true);
    const stream = await agencyPrivateStorage.openReadStream(doc.storageKey);
    await activityService.record({
      actor,
      action: 'document_downloaded',
      entityType: 'document',
      entityId: doc.id,
      entityCode: doc.code,
      clientId: String(doc.clientId),
      projectId: doc.projectId ? String(doc.projectId) : null,
      message: `Document downloaded: ${doc.code}`,
    });
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(doc.originalFileName)}"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    stream.pipe(res);
  }
}

export const documentService = new DocumentService();
