import { Types } from 'mongoose';
import { BadRequestError, NotFoundError } from '@core/errors';
import { buildPaginationMeta, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import { UserRole } from '@core/constants';
import { AgencyClient } from '@modules/agency/clients/model/client.model';
import { allocateAgencyDocumentCode } from '@modules/agency/clients/service/number-sequence.service';
import { AgencyProject } from '@modules/agency/projects/model/project.model';
import { activityService } from '@modules/agency/activity/service/activity.service';
import {
  ChecklistItemKey,
  ChecklistItemStatus,
  DEFAULT_HANDOVER_CHECKLIST,
  HandoverStatus,
  IHandoverChecklistItem,
  IProjectHandover,
  ProjectHandover,
} from '../model/handover.model';
import { buildHandoverPdfBuffer } from './handover-pdf.service';

export type HandoverActor = {
  id: string;
  role: UserRole | string;
  email?: string;
  fullName?: string;
};

export type CreateHandoverDto = {
  clientId?: string;
  projectId: string;
  title?: string;
  warrantyTerms?: string;
  maintenanceTerms?: string;
  credentialTransferNotes?: string;
  customChecklistItems?: Array<{ label: string }>;
};

export type UpdateChecklistItemDto = {
  itemId: string;
  status?: ChecklistItemStatus;
  responsiblePerson?: string;
  notes?: string;
  blockedReason?: string;
  waivedReason?: string;
};

export class HandoverService {
  private async getOrThrow(id: string): Promise<IProjectHandover> {
    const doc = await ProjectHandover.findById(id).exec();
    if (!doc || doc.isDeleted) throw new NotFoundError('Handover');
    return doc;
  }

  private toResponse(doc: IProjectHandover, extras?: { clientName?: string; projectName?: string }) {
    const counts = {
      pending: 0,
      completed: 0,
      waived: 0,
      blocked: 0,
    };
    for (const item of doc.checklist ?? []) {
      counts[item.status] += 1;
    }
    return {
      id: doc.id,
      code: doc.code,
      clientId: String(doc.clientId),
      clientName: extras?.clientName,
      projectId: String(doc.projectId),
      projectName: extras?.projectName,
      title: doc.title,
      status: doc.status,
      checklist: (doc.checklist ?? []).map((item) => ({
        id: String((item as { _id?: Types.ObjectId })._id ?? ''),
        key: item.key,
        label: item.label,
        status: item.status,
        responsiblePerson: item.responsiblePerson,
        notes: item.notes,
        blockedReason: item.blockedReason,
        completedAt: item.completedAt?.toISOString(),
        completedByName: item.completedByName,
        waivedAt: item.waivedAt?.toISOString(),
        waivedReason: item.waivedReason,
      })),
      checklistCounts: counts,
      credentialTransferNotes: doc.credentialTransferNotes,
      warrantyTerms: doc.warrantyTerms,
      maintenanceTerms: doc.maintenanceTerms,
      clientAcceptanceNotes: doc.clientAcceptanceNotes,
      completedAt: doc.completedAt?.toISOString(),
      completedByName: doc.completedByName,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      pdfPath: `/agency/handovers/${doc.id}/pdf`,
    };
  }

  async list(
    query: PaginationQuery & { clientId?: string; projectId?: string; status?: HandoverStatus },
  ): Promise<{ items: ReturnType<HandoverService['toResponse']>[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'updatedAt',
      order: query.order ?? 'desc',
    });
    const filter: Record<string, unknown> = { isDeleted: { $ne: true } };
    if (query.clientId) filter.clientId = new Types.ObjectId(query.clientId);
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.status) filter.status = query.status;

    const [docs, total] = await Promise.all([
      ProjectHandover.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      ProjectHandover.countDocuments(filter),
    ]);
    const clientIds = [...new Set(docs.map((d) => String(d.clientId)))];
    const projectIds = [...new Set(docs.map((d) => String(d.projectId)))];
    const [clients, projects] = await Promise.all([
      AgencyClient.find({ _id: { $in: clientIds } }).select('name').exec(),
      AgencyProject.find({ _id: { $in: projectIds } }).select('name').exec(),
    ]);
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));
    return {
      items: docs.map((d) =>
        this.toResponse(d, {
          clientName: clientMap.get(String(d.clientId)),
          projectName: projectMap.get(String(d.projectId)),
        }),
      ),
      meta: buildPaginationMeta(total, page, limit) as PaginationMeta,
    };
  }

  async getById(id: string) {
    const doc = await this.getOrThrow(id);
    const [client, project] = await Promise.all([
      AgencyClient.findById(doc.clientId).select('name').exec(),
      AgencyProject.findById(doc.projectId).select('name code').exec(),
    ]);
    return this.toResponse(doc, { clientName: client?.name, projectName: project?.name });
  }

  async create(dto: CreateHandoverDto, actor: HandoverActor) {
    const project = await AgencyProject.findById(dto.projectId).exec();
    if (!project || project.isDeleted) throw new BadRequestError('Project not found');
    const clientId = dto.clientId ?? String(project.clientId);
    if (String(project.clientId) !== clientId) {
      throw new BadRequestError('Project does not belong to the selected client');
    }

    const checklist = [
      ...DEFAULT_HANDOVER_CHECKLIST.map((item) => ({
        key: item.key,
        label: item.label,
        status: 'pending' as ChecklistItemStatus,
      })),
      ...(dto.customChecklistItems ?? []).map((item) => ({
        key: 'custom' as ChecklistItemKey,
        label: item.label.trim(),
        status: 'pending' as ChecklistItemStatus,
      })),
    ];

    const code = await allocateAgencyDocumentCode('handover');
    const doc = await ProjectHandover.create({
      code,
      clientId: new Types.ObjectId(clientId),
      projectId: project._id,
      title: (dto.title?.trim() || `Handover — ${project.name}`).slice(0, 240),
      status: 'draft',
      checklist,
      warrantyTerms: dto.warrantyTerms?.trim(),
      maintenanceTerms: dto.maintenanceTerms?.trim(),
      credentialTransferNotes:
        dto.credentialTransferNotes?.trim() ||
        'Transfer credentials via the secure vault with audited reveal. Do not email or print secrets.',
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });

    await activityService.record({
      actor,
      action: 'handover_created',
      entityType: 'handover',
      entityId: doc.id,
      entityCode: doc.code,
      clientId,
      projectId: String(project._id),
      message: `Handover started: ${doc.code}`,
    });

    return this.toResponse(doc, { projectName: project.name });
  }

  async updateChecklistItem(id: string, dto: UpdateChecklistItemDto, actor: HandoverActor) {
    const doc = await this.getOrThrow(id);
    if (doc.status === 'completed' || doc.status === 'cancelled') {
      throw new BadRequestError('Completed or cancelled handovers cannot change checklist items');
    }
    const checklist = doc.checklist as Types.DocumentArray<IHandoverChecklistItem>;
    const item = checklist.id(dto.itemId);
    if (!item) throw new NotFoundError('Checklist item');

    if (dto.responsiblePerson !== undefined) item.responsiblePerson = dto.responsiblePerson?.trim();
    if (dto.notes !== undefined) item.notes = dto.notes?.trim();

    if (dto.status) {
      item.status = dto.status;
      if (dto.status === 'completed') {
        item.completedAt = new Date();
        item.completedByName = actor.fullName || actor.email;
        item.waivedAt = undefined;
        item.waivedReason = undefined;
        item.blockedReason = undefined;
      } else if (dto.status === 'waived') {
        if (!dto.waivedReason?.trim()) throw new BadRequestError('waivedReason is required');
        item.waivedAt = new Date();
        item.waivedReason = dto.waivedReason.trim();
        item.completedAt = undefined;
      } else if (dto.status === 'blocked') {
        if (!dto.blockedReason?.trim()) throw new BadRequestError('blockedReason is required');
        item.blockedReason = dto.blockedReason.trim();
        item.completedAt = undefined;
      } else {
        item.completedAt = undefined;
        item.waivedAt = undefined;
        item.blockedReason = undefined;
      }
    }

    if (doc.status === 'draft') doc.status = 'in_progress';
    const open = (doc.checklist ?? []).filter((i) => i.status === 'pending' || i.status === 'blocked');
    if (open.length === 0 && (doc.checklist ?? []).length > 0) {
      doc.status = 'ready_for_review';
    }

    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();

    await activityService.record({
      actor,
      action: 'handover_checklist_updated',
      entityType: 'handover',
      entityId: doc.id,
      entityCode: doc.code,
      clientId: String(doc.clientId),
      projectId: String(doc.projectId),
      message: `Handover checklist item updated: ${item.label} → ${item.status}`,
      meta: { itemKey: item.key, status: item.status },
    });

    return this.toResponse(doc);
  }

  async updateMeta(
    id: string,
    dto: {
      title?: string;
      warrantyTerms?: string;
      maintenanceTerms?: string;
      clientAcceptanceNotes?: string;
      credentialTransferNotes?: string;
      status?: HandoverStatus;
    },
    actor: HandoverActor,
  ) {
    const doc = await this.getOrThrow(id);
    if (doc.status === 'completed' && dto.status && dto.status !== 'completed') {
      throw new BadRequestError('Completed handovers cannot be reopened silently');
    }
    if (dto.title !== undefined) doc.title = dto.title.trim();
    if (dto.warrantyTerms !== undefined) doc.warrantyTerms = dto.warrantyTerms?.trim();
    if (dto.maintenanceTerms !== undefined) doc.maintenanceTerms = dto.maintenanceTerms?.trim();
    if (dto.clientAcceptanceNotes !== undefined) {
      doc.clientAcceptanceNotes = dto.clientAcceptanceNotes?.trim();
    }
    if (dto.credentialTransferNotes !== undefined) {
      doc.credentialTransferNotes = dto.credentialTransferNotes?.trim();
    }
    if (dto.status === 'in_progress' || dto.status === 'ready_for_review' || dto.status === 'cancelled') {
      doc.status = dto.status;
    }
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    return this.toResponse(doc);
  }

  async complete(id: string, actor: HandoverActor) {
    const doc = await this.getOrThrow(id);
    if (doc.status === 'completed') throw new BadRequestError('Already completed');
    if (doc.status === 'cancelled') throw new BadRequestError('Cancelled handover cannot be completed');

    const blocked = (doc.checklist ?? []).filter((i) => i.status === 'blocked');
    if (blocked.length) {
      throw new BadRequestError(
        `Cannot complete handover while ${blocked.length} checklist item(s) are blocked`,
      );
    }
    const pending = (doc.checklist ?? []).filter((i) => i.status === 'pending');
    if (pending.length) {
      throw new BadRequestError(
        `Cannot complete handover while ${pending.length} checklist item(s) are pending`,
      );
    }

    doc.status = 'completed';
    doc.completedAt = new Date();
    doc.completedBy = new Types.ObjectId(actor.id);
    doc.completedByName = actor.fullName || actor.email;
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();

    await activityService.record({
      actor,
      action: 'handover_completed',
      entityType: 'handover',
      entityId: doc.id,
      entityCode: doc.code,
      clientId: String(doc.clientId),
      projectId: String(doc.projectId),
      message: `Handover completed: ${doc.code}`,
      immutable: true,
    });

    return this.toResponse(doc);
  }

  async buildPdf(id: string) {
    const doc = await this.getOrThrow(id);
    const [client, project] = await Promise.all([
      AgencyClient.findById(doc.clientId).select('name').exec(),
      AgencyProject.findById(doc.projectId).select('name code').exec(),
    ]);
    return buildHandoverPdfBuffer(doc, {
      clientName: client?.name,
      projectName: project?.name,
      projectCode: project?.code,
    });
  }
}

export const handoverService = new HandoverService();
