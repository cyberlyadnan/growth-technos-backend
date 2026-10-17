import { Types } from 'mongoose';
import { BadRequestError, NotFoundError } from '@core/errors';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import { AgencyClient } from '@modules/agency/clients/model/client.model';
import { allocateAgencyDocumentCode } from '@modules/agency/clients/service/number-sequence.service';
import { AgencyProject } from '@modules/agency/projects/model/project.model';
import { AgencyAsset } from '@modules/agency/assets/model/asset.model';
import { MaintenanceAgreement } from '../model/agreement.model';
import {
  ISupportTicket,
  SupportPriority,
  SupportStatus,
  SupportTicket,
} from '../model/support-ticket.model';
import type { MaintenanceActor } from './agreement.service';

type Filter = Record<string, unknown>;

export type CreateSupportDto = {
  clientId: string;
  projectId?: string | null;
  agreementId?: string | null;
  assetId?: string | null;
  title: string;
  description: string;
  priority?: SupportPriority;
  assignedToUserId?: string | null;
  assignedToName?: string;
  documents?: Array<{ fileName: string; url: string; mimeType?: string }>;
};

export type UpdateSupportDto = Partial<CreateSupportDto> & {
  status?: SupportStatus;
  resolution?: string;
};

export type AddWorkLogDto = {
  description: string;
  minutesSpent: number;
  workedAt?: Date;
};

export type ListSupportQuery = PaginationQuery & {
  search?: string;
  clientId?: string;
  projectId?: string;
  agreementId?: string;
  assetId?: string;
  status?: SupportStatus;
  priority?: SupportPriority;
};

export class SupportService {
  private async getOrThrow(id: string): Promise<ISupportTicket> {
    const doc = await SupportTicket.findById(id).exec();
    if (!doc || doc.isDeleted) throw new NotFoundError('Support ticket');
    return doc;
  }

  private async assertLinks(dto: {
    clientId: string;
    projectId?: string | null;
    agreementId?: string | null;
    assetId?: string | null;
  }) {
    const client = await AgencyClient.findById(dto.clientId).exec();
    if (!client || client.isDeleted) throw new BadRequestError('Client not found');

    if (dto.projectId) {
      const project = await AgencyProject.findById(dto.projectId).exec();
      if (!project || project.isDeleted) throw new BadRequestError('Project not found');
      if (String(project.clientId) !== dto.clientId) {
        throw new BadRequestError('Project does not belong to the selected client');
      }
    }
    if (dto.agreementId) {
      const agreement = await MaintenanceAgreement.findById(dto.agreementId).exec();
      if (!agreement || agreement.isDeleted) throw new BadRequestError('Agreement not found');
      if (String(agreement.clientId) !== dto.clientId) {
        throw new BadRequestError('Agreement does not belong to the selected client');
      }
    }
    if (dto.assetId) {
      const asset = await AgencyAsset.findById(dto.assetId).exec();
      if (!asset || asset.isDeleted) throw new BadRequestError('Asset not found');
      if (String(asset.clientId) !== dto.clientId) {
        throw new BadRequestError('Asset does not belong to the selected client');
      }
    }
  }

  private toResponse(doc: ISupportTicket) {
    return {
      id: doc.id,
      code: doc.code,
      clientId: String(doc.clientId),
      projectId: doc.projectId ? String(doc.projectId) : null,
      agreementId: doc.agreementId ? String(doc.agreementId) : null,
      assetId: doc.assetId ? String(doc.assetId) : null,
      title: doc.title,
      description: doc.description,
      priority: doc.priority,
      status: doc.status,
      assignedToUserId: doc.assignedToUserId ? String(doc.assignedToUserId) : null,
      assignedToName: doc.assignedToName,
      resolution: doc.resolution,
      totalMinutesSpent: doc.totalMinutesSpent,
      workLogs: (doc.workLogs ?? []).map((w) => ({
        id: String((w as { _id?: Types.ObjectId })._id ?? ''),
        description: w.description,
        minutesSpent: w.minutesSpent,
        workedAt: w.workedAt.toISOString(),
        createdByName: w.createdByName,
        createdAt: w.createdAt.toISOString(),
      })),
      documents: doc.documents ?? [],
      resolvedAt: doc.resolvedAt?.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  async list(
    query: ListSupportQuery,
  ): Promise<{ items: ReturnType<SupportService['toResponse']>[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'createdAt',
      order: query.order ?? 'desc',
    });
    const filter: Filter = {
      isDeleted: { $ne: true },
      ...buildSearchFilter(query.search, ['code', 'title', 'description']),
    };
    if (query.clientId) filter.clientId = new Types.ObjectId(query.clientId);
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.agreementId) filter.agreementId = new Types.ObjectId(query.agreementId);
    if (query.assetId) filter.assetId = new Types.ObjectId(query.assetId);
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;

    const [docs, total] = await Promise.all([
      SupportTicket.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      SupportTicket.countDocuments(filter),
    ]);
    return {
      items: docs.map((d) => this.toResponse(d)),
      meta: buildPaginationMeta(total, page, limit) as PaginationMeta,
    };
  }

  async getById(id: string) {
    return this.toResponse(await this.getOrThrow(id));
  }

  async create(dto: CreateSupportDto, actor: MaintenanceActor) {
    await this.assertLinks(dto);
    const code = await allocateAgencyDocumentCode('support');
    const doc = await SupportTicket.create({
      code,
      clientId: new Types.ObjectId(dto.clientId),
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      agreementId: dto.agreementId ? new Types.ObjectId(dto.agreementId) : null,
      assetId: dto.assetId ? new Types.ObjectId(dto.assetId) : null,
      title: dto.title.trim(),
      description: dto.description.trim(),
      priority: dto.priority ?? 'medium',
      assignedToUserId: dto.assignedToUserId ? new Types.ObjectId(dto.assignedToUserId) : null,
      assignedToName: dto.assignedToName?.trim(),
      documents: dto.documents ?? [],
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });
    return this.toResponse(doc);
  }

  async update(id: string, dto: UpdateSupportDto, actor: MaintenanceActor) {
    const doc = await this.getOrThrow(id);
    if (dto.clientId || dto.projectId !== undefined || dto.agreementId !== undefined || dto.assetId !== undefined) {
      await this.assertLinks({
        clientId: dto.clientId ?? String(doc.clientId),
        projectId: dto.projectId !== undefined ? dto.projectId : doc.projectId ? String(doc.projectId) : null,
        agreementId:
          dto.agreementId !== undefined
            ? dto.agreementId
            : doc.agreementId
              ? String(doc.agreementId)
              : null,
        assetId: dto.assetId !== undefined ? dto.assetId : doc.assetId ? String(doc.assetId) : null,
      });
    }
    if (dto.clientId) doc.clientId = new Types.ObjectId(dto.clientId);
    if (dto.projectId !== undefined) {
      doc.projectId = dto.projectId ? new Types.ObjectId(dto.projectId) : null;
    }
    if (dto.agreementId !== undefined) {
      doc.agreementId = dto.agreementId ? new Types.ObjectId(dto.agreementId) : null;
    }
    if (dto.assetId !== undefined) {
      doc.assetId = dto.assetId ? new Types.ObjectId(dto.assetId) : null;
    }
    if (dto.title !== undefined) doc.title = dto.title.trim();
    if (dto.description !== undefined) doc.description = dto.description.trim();
    if (dto.priority !== undefined) doc.priority = dto.priority;
    if (dto.assignedToUserId !== undefined) {
      doc.assignedToUserId = dto.assignedToUserId
        ? new Types.ObjectId(dto.assignedToUserId)
        : null;
    }
    if (dto.assignedToName !== undefined) doc.assignedToName = dto.assignedToName?.trim();
    if (dto.resolution !== undefined) doc.resolution = dto.resolution?.trim();
    if (dto.status !== undefined) {
      doc.status = dto.status;
      if (dto.status === 'resolved' || dto.status === 'closed') {
        doc.resolvedAt = doc.resolvedAt ?? new Date();
      }
    }
    if (dto.documents !== undefined) doc.documents = dto.documents;
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    return this.toResponse(doc);
  }

  async addWorkLog(id: string, dto: AddWorkLogDto, actor: MaintenanceActor) {
    const doc = await this.getOrThrow(id);
    if (['closed', 'cancelled'].includes(doc.status)) {
      throw new BadRequestError('Cannot add work logs to closed/cancelled tickets');
    }
    doc.workLogs.push({
      description: dto.description.trim(),
      minutesSpent: dto.minutesSpent,
      workedAt: dto.workedAt ?? new Date(),
      createdBy: new Types.ObjectId(actor.id),
      createdByName: actor.fullName,
      createdAt: new Date(),
    });
    doc.totalMinutesSpent = (doc.workLogs ?? []).reduce((s, w) => s + w.minutesSpent, 0);
    if (doc.status === 'open') doc.status = 'in_progress';
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    return this.toResponse(doc);
  }
}

export const supportService = new SupportService();
