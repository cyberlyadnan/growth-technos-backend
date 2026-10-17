import { Types, type UpdateQuery } from 'mongoose';
import { randomBytes } from 'crypto';
import { BadRequestError, ConflictError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import { UserRole } from '@core/constants';
import { DEFAULT_AGENCY_CURRENCY, type CurrencyCode } from '@core/utils/money';
import { AgencyClient } from '@modules/agency/clients/model/client.model';
import { allocateAgencyDocumentCode } from '@modules/agency/clients/service/number-sequence.service';
import { User } from '@modules/users/model/user.model';
import {
  AgencyProject,
  AgencyProjectBillingModel,
  AgencyProjectPriority,
  AgencyProjectStatus,
  IAgencyProject,
  IProjectAcceptance,
  IProjectActivityEntry,
  IProjectApproval,
  IProjectAttachment,
  IProjectChangeRequest,
  IProjectDeliverable,
  IProjectDependency,
  IProjectMilestone,
  IProjectScope,
  IProjectTask,
} from '../model/project.model';
import {
  assertCanComplete,
  assertValidStatusTransition,
  computeProgressPercent,
  statusToIsActive,
} from './project.workflow';

type ProjectFilter = Record<string, unknown>;

export type ProjectActor = {
  id: string;
  role: UserRole | string;
  fullName?: string;
};

export type ProjectAttachmentInput = {
  mediaId?: string | null;
  url: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type CreateProjectDto = {
  clientId: string;
  name: string;
  description?: string;
  serviceCategory?: string;
  status?: AgencyProjectStatus;
  priority?: AgencyProjectPriority;
  assignedManagerId?: string | null;
  startDate?: Date | null;
  targetDeliveryDate?: Date | null;
  completionDate?: Date | null;
  billingModel?: AgencyProjectBillingModel;
  contractValue?: { amountMinor: number; currency?: CurrencyCode };
  estimatedCostMinor?: number | null;
  scope?: { summary?: string; items?: string[] };
  milestones?: Array<Partial<IProjectMilestone> & { title: string }>;
  tasks?: Array<Partial<IProjectTask> & { title: string }>;
  deliverables?: Array<Partial<IProjectDeliverable> & { title: string }>;
  dependencies?: Array<Partial<IProjectDependency> & { description: string }>;
  progressPercent?: number;
  stagingUrl?: string;
  productionUrl?: string;
  warrantyDays?: number;
  postDeliveryObligations?: string;
  quotationId?: string | null;
  quotationCode?: string;
  portfolioProjectId?: string | null;
  tags?: string[];
  notes?: string;
  attachments?: ProjectAttachmentInput[];
};

export type UpdateProjectDto = Partial<CreateProjectDto>;

export type ListProjectsQuery = PaginationQuery & {
  search?: string;
  status?: AgencyProjectStatus;
  priority?: AgencyProjectPriority;
  billingModel?: AgencyProjectBillingModel;
  clientId?: string;
  assignedManagerId?: string;
  serviceCategory?: string;
  includeTrash?: boolean;
  trashOnly?: boolean;
};

function newKey(prefix: string): string {
  return `${prefix}_${randomBytes(4).toString('hex')}`;
}

function uniqueStrings(values: string[] | undefined): string[] {
  if (!values?.length) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

export type AgencyProjectResponse = {
  id: string;
  code: string;
  clientId: string;
  clientName?: string;
  clientCode?: string;
  name: string;
  description?: string;
  serviceCategory?: string;
  status: AgencyProjectStatus;
  priority: AgencyProjectPriority;
  assignedManagerId?: string | null;
  assignedManagerName?: string;
  startDate?: string;
  targetDeliveryDate?: string;
  completionDate?: string;
  billingModel: AgencyProjectBillingModel;
  contractValue: { amountMinor: number; currency: CurrencyCode };
  estimatedCostMinor?: number | null;
  scope: {
    summary?: string;
    items: string[];
    version: number;
    isApproved: boolean;
    approvedAt?: string;
    approvedBy?: string | null;
    approvedByName?: string;
  };
  milestones: IProjectMilestone[];
  tasks: Array<Omit<IProjectTask, 'assigneeId'> & { assigneeId?: string | null }>;
  deliverables: Array<
    Omit<IProjectDeliverable, 'dueDate' | 'deliveredAt' | 'acceptedAt'> & {
      dueDate?: string;
      deliveredAt?: string;
      acceptedAt?: string;
    }
  >;
  dependencies: IProjectDependency[];
  changeRequests: Array<
    Omit<IProjectChangeRequest, 'requestedAt' | 'resolvedAt' | 'requestedBy'> & {
      requestedAt: string;
      resolvedAt?: string;
      requestedBy?: string | null;
    }
  >;
  approvals: Array<
    Omit<IProjectApproval, 'decidedAt' | 'decidedBy'> & {
      decidedAt: string;
      decidedBy?: string | null;
    }
  >;
  acceptanceRecords: Array<
    Omit<IProjectAcceptance, 'acceptedAt' | 'acceptedBy'> & {
      acceptedAt: string;
      acceptedBy?: string | null;
    }
  >;
  progressPercent: number;
  stagingUrl?: string;
  productionUrl?: string;
  warrantyDays: number;
  postDeliveryObligations?: string;
  quotationId?: string | null;
  quotationCode?: string;
  invoiceIds: string[];
  portfolioProjectId?: string | null;
  tags: string[];
  notes?: string;
  attachments: Array<{
    id?: string;
    mediaId?: string | null;
    url: string;
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
    uploadedAt: string;
    uploadedBy?: string | null;
  }>;
  activityLog: Array<{
    id?: string;
    type: string;
    message: string;
    meta?: Record<string, unknown>;
    createdBy?: string | null;
    createdByName?: string;
    createdAt: string;
  }>;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  /** Honest financial summary — contract metadata only; no invoices/payments. */
  financialSummary: {
    contractValueMinor: number;
    currency: CurrencyCode;
    estimatedCostMinor: number | null;
    note: string;
    invoiceCount: number;
    invoicesAvailable: false;
  };
};

export class ProjectService {
  private toResponse(
    project: IAgencyProject,
    extras?: { clientName?: string; clientCode?: string; managerName?: string },
  ): AgencyProjectResponse {
    const currency =
      (project.contractValue?.currency as CurrencyCode) ?? DEFAULT_AGENCY_CURRENCY;
    return {
      id: project.id,
      code: project.code,
      clientId: String(project.clientId),
      clientName: extras?.clientName,
      clientCode: extras?.clientCode,
      name: project.name,
      description: project.description,
      serviceCategory: project.serviceCategory,
      status: project.status,
      priority: project.priority,
      assignedManagerId: project.assignedManagerId
        ? String(project.assignedManagerId)
        : null,
      assignedManagerName: extras?.managerName,
      startDate: project.startDate?.toISOString(),
      targetDeliveryDate: project.targetDeliveryDate?.toISOString(),
      completionDate: project.completionDate?.toISOString(),
      billingModel: project.billingModel,
      contractValue: {
        amountMinor: project.contractValue?.amountMinor ?? 0,
        currency,
      },
      estimatedCostMinor: project.estimatedCostMinor ?? null,
      scope: {
        summary: project.scope?.summary,
        items: project.scope?.items ?? [],
        version: project.scope?.version ?? 1,
        isApproved: Boolean(project.scope?.isApproved),
        approvedAt: project.scope?.approvedAt?.toISOString(),
        approvedBy: project.scope?.approvedBy ? String(project.scope.approvedBy) : null,
        approvedByName: project.scope?.approvedByName,
      },
      milestones: (project.milestones ?? []).map((item) => ({
        key: item.key,
        title: item.title,
        description: item.description,
        dueDate: item.dueDate,
        status: item.status,
        progressPercent: item.progressPercent,
        order: item.order,
        dependsOnKeys: item.dependsOnKeys ?? [],
      })),
      tasks: (project.tasks ?? []).map((task) => ({
        key: task.key,
        title: task.title,
        description: task.description,
        milestoneKey: task.milestoneKey,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId ? String(task.assigneeId) : null,
        dueDate: task.dueDate,
      })),
      deliverables: (project.deliverables ?? []).map((item) => ({
        key: item.key,
        title: item.title,
        description: item.description,
        status: item.status,
        dueDate: item.dueDate?.toISOString?.() ?? (item.dueDate ? String(item.dueDate) : undefined),
        deliveredAt: item.deliveredAt?.toISOString?.(),
        acceptedAt: item.acceptedAt?.toISOString?.(),
        acceptedByName: item.acceptedByName,
      })),
      dependencies: (project.dependencies ?? []).map((item) => ({
        key: item.key,
        description: item.description,
        fromMilestoneKey: item.fromMilestoneKey,
        toMilestoneKey: item.toMilestoneKey,
      })),
      changeRequests: (project.changeRequests ?? []).map((item) => ({
        key: item.key,
        title: item.title,
        description: item.description,
        status: item.status,
        proposedScopeSummary: item.proposedScopeSummary,
        proposedScopeItems: item.proposedScopeItems ?? [],
        requestedAt: item.requestedAt?.toISOString?.() ?? new Date(item.requestedAt).toISOString(),
        resolvedAt: item.resolvedAt?.toISOString?.(),
        requestedBy: item.requestedBy ? String(item.requestedBy) : null,
        requestedByName: item.requestedByName,
        resolvedByName: item.resolvedByName,
        resolutionNote: item.resolutionNote,
      })),
      approvals: (project.approvals ?? []).map((item) => ({
        key: item.key,
        type: item.type,
        subjectKey: item.subjectKey,
        status: item.status,
        note: item.note,
        decidedAt: item.decidedAt?.toISOString?.() ?? new Date(item.decidedAt).toISOString(),
        decidedBy: item.decidedBy ? String(item.decidedBy) : null,
        decidedByName: item.decidedByName,
      })),
      acceptanceRecords: (project.acceptanceRecords ?? []).map((item) => ({
        key: item.key,
        notes: item.notes,
        acceptedAt: item.acceptedAt?.toISOString?.() ?? new Date(item.acceptedAt).toISOString(),
        acceptedBy: item.acceptedBy ? String(item.acceptedBy) : null,
        acceptedByName: item.acceptedByName,
      })),
      progressPercent: project.progressPercent ?? 0,
      stagingUrl: project.stagingUrl,
      productionUrl: project.productionUrl,
      warrantyDays: project.warrantyDays ?? 30,
      postDeliveryObligations: project.postDeliveryObligations,
      quotationId: project.quotationId ? String(project.quotationId) : null,
      quotationCode: project.quotationCode,
      invoiceIds: (project.invoiceIds ?? []).map(String),
      portfolioProjectId: project.portfolioProjectId
        ? String(project.portfolioProjectId)
        : null,
      tags: project.tags ?? [],
      notes: project.notes,
      attachments: (project.attachments ?? []).map((item) => {
        const withId = item as IProjectAttachment & { _id?: Types.ObjectId; id?: string };
        return {
          id: withId.id ? String(withId.id) : withId._id ? String(withId._id) : undefined,
          mediaId: item.mediaId ? String(item.mediaId) : null,
          url: item.url,
          fileName: item.fileName,
          mimeType: item.mimeType,
          sizeBytes: item.sizeBytes,
          uploadedAt: item.uploadedAt?.toISOString?.() ?? new Date(item.uploadedAt).toISOString(),
          uploadedBy: item.uploadedBy ? String(item.uploadedBy) : null,
        };
      }),
      activityLog: (project.activityLog ?? [])
        .slice()
        .reverse()
        .map((entry) => {
          const withId = entry as IProjectActivityEntry & { _id?: Types.ObjectId; id?: string };
          return {
            id: withId.id ? String(withId.id) : withId._id ? String(withId._id) : undefined,
            type: entry.type,
            message: entry.message,
            meta: entry.meta,
            createdBy: entry.createdBy ? String(entry.createdBy) : null,
            createdByName: entry.createdByName,
            createdAt: entry.createdAt?.toISOString?.() ?? new Date(entry.createdAt).toISOString(),
          };
        }),
      isActive: project.isActive,
      isDeleted: project.isDeleted,
      deletedAt: project.deletedAt?.toISOString(),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      financialSummary: {
        contractValueMinor: project.contractValue?.amountMinor ?? 0,
        currency,
        estimatedCostMinor: project.estimatedCostMinor ?? null,
        note: 'Contract and estimate metadata only. Invoices and payments are not available in this phase.',
        invoiceCount: (project.invoiceIds ?? []).length,
        invoicesAvailable: false,
      },
    };
  }

  private buildActivity(
    type: string,
    message: string,
    actor: ProjectActor,
    meta?: Record<string, unknown>,
  ): IProjectActivityEntry {
    return {
      type,
      message,
      meta,
      createdBy: new Types.ObjectId(actor.id),
      createdByName: actor.fullName,
      createdAt: new Date(),
    };
  }

  private async getOrThrow(id: string, includeDeleted = false): Promise<IAgencyProject> {
    const query = AgencyProject.findById(id);
    if (includeDeleted) query.setOptions({ includeDeleted: true });
    const project = await query.exec();
    if (!project) throw new NotFoundError('Project');
    return project;
  }

  private assertScope(project: IAgencyProject, actor: ProjectActor): void {
    const isPrivileged =
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.MANAGER;
    if (isPrivileged) return;
    if (project.assignedManagerId && String(project.assignedManagerId) !== actor.id) {
      throw new NotFoundError('Project');
    }
  }

  private applyActorScopeFilter(filter: ProjectFilter, actor: ProjectActor): ProjectFilter {
    const isPrivileged =
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.MANAGER;
    if (isPrivileged) return filter;
    return {
      ...filter,
      $or: [
        { assignedManagerId: actor.id },
        { assignedManagerId: null },
        { assignedManagerId: { $exists: false } },
      ],
    };
  }

  private async assertClientExists(clientId: string): Promise<{
    id: string;
    name: string;
    code: string;
  }> {
    const client = await AgencyClient.findById(clientId).exec();
    if (!client || client.isDeleted) throw new BadRequestError('Client not found');
    return { id: client.id, name: client.name, code: client.code };
  }

  private async assertManagerExists(managerId?: string | null): Promise<void> {
    if (!managerId) return;
    const user = await User.findById(managerId).exec();
    if (!user || user.isDeleted) throw new BadRequestError('Assigned manager not found');
  }

  private async resolveNames(project: IAgencyProject): Promise<{
    clientName?: string;
    clientCode?: string;
    managerName?: string;
  }> {
    const [client, manager] = await Promise.all([
      AgencyClient.findById(project.clientId).select('name code').exec(),
      project.assignedManagerId
        ? User.findById(project.assignedManagerId).select('firstName lastName email').exec()
        : null,
    ]);
    return {
      clientName: client?.name,
      clientCode: client?.code,
      managerName: manager
        ? `${manager.firstName} ${manager.lastName}`.trim() || manager.email
        : undefined,
    };
  }

  private mapAttachments(
    attachments: ProjectAttachmentInput[] | undefined,
    actorId: string,
  ): IProjectAttachment[] {
    if (!attachments?.length) return [];
    return attachments.map((item) => ({
      mediaId: item.mediaId ? new Types.ObjectId(item.mediaId) : null,
      url: item.url,
      fileName: item.fileName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      uploadedAt: new Date(),
      uploadedBy: new Types.ObjectId(actorId),
    }));
  }

  private mapMilestones(
    items: CreateProjectDto['milestones'],
  ): IProjectMilestone[] {
    if (!items?.length) return [];
    return items.map((item, index) => ({
      key: item.key?.trim() || newKey('ms'),
      title: item.title.trim(),
      description: item.description?.trim(),
      dueDate: item.dueDate || undefined,
      status: item.status ?? 'pending',
      progressPercent: item.progressPercent ?? 0,
      order: item.order ?? index,
      dependsOnKeys: item.dependsOnKeys ?? [],
    }));
  }

  private mapTasks(items: CreateProjectDto['tasks']): IProjectTask[] {
    if (!items?.length) return [];
    return items.map((item) => ({
      key: item.key?.trim() || newKey('task'),
      title: item.title.trim(),
      description: item.description?.trim(),
      milestoneKey: item.milestoneKey?.trim(),
      status: item.status ?? 'todo',
      priority: item.priority ?? 'medium',
      assigneeId: item.assigneeId ? new Types.ObjectId(String(item.assigneeId)) : null,
      dueDate: item.dueDate || undefined,
    }));
  }

  private mapDeliverables(
    items: CreateProjectDto['deliverables'],
  ): IProjectDeliverable[] {
    if (!items?.length) return [];
    return items.map((item) => ({
      key: item.key?.trim() || newKey('del'),
      title: item.title.trim(),
      description: item.description?.trim(),
      status: item.status ?? 'pending',
      dueDate: item.dueDate || undefined,
      deliveredAt: item.status === 'delivered' || item.status === 'accepted' ? new Date() : undefined,
      acceptedAt: item.status === 'accepted' ? new Date() : undefined,
    }));
  }

  private mapDependencies(
    items: CreateProjectDto['dependencies'],
  ): IProjectDependency[] {
    if (!items?.length) return [];
    return items.map((item) => ({
      key: item.key?.trim() || newKey('dep'),
      description: item.description.trim(),
      fromMilestoneKey: item.fromMilestoneKey?.trim(),
      toMilestoneKey: item.toMilestoneKey?.trim(),
    }));
  }

  private buildScope(input?: { summary?: string; items?: string[] }): IProjectScope {
    return {
      summary: input?.summary?.trim() || undefined,
      items: uniqueStrings(input?.items),
      version: 1,
      isApproved: false,
    };
  }

  private assertScopeEditable(project: IAgencyProject, dto: UpdateProjectDto): void {
    if (dto.scope === undefined) return;
    if (!project.scope?.isApproved) return;
    throw new BadRequestError(
      'Approved scope cannot be overwritten. Submit a change request to propose scope changes.',
    );
  }

  async list(
    query: ListProjectsQuery,
    actor: ProjectActor,
  ): Promise<{ items: AgencyProjectResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'createdAt',
      order: query.order ?? 'desc',
    });

    let filter: ProjectFilter = {
      ...buildSearchFilter(query.search, ['name', 'description', 'code', 'notes', 'serviceCategory']),
    };

    if (query.trashOnly) filter.isDeleted = true;
    else if (!query.includeTrash) filter.isDeleted = { $ne: true };

    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.billingModel) filter.billingModel = query.billingModel;
    if (query.clientId) filter.clientId = query.clientId;
    if (query.assignedManagerId) filter.assignedManagerId = query.assignedManagerId;
    if (query.serviceCategory) filter.serviceCategory = query.serviceCategory;

    filter = this.applyActorScopeFilter(filter, actor);

    const findQuery = AgencyProject.find(filter).sort(sort).skip(skip).limit(limit);
    const countQuery = AgencyProject.countDocuments(filter);
    if (query.trashOnly || query.includeTrash) {
      findQuery.setOptions({ includeDeleted: true });
      countQuery.setOptions({ includeDeleted: true });
    }

    const [items, total] = await Promise.all([findQuery.exec(), countQuery.exec()]);

    const clientIds = [...new Set(items.map((item) => String(item.clientId)))];
    const managerIds = [
      ...new Set(
        items
          .map((item) => (item.assignedManagerId ? String(item.assignedManagerId) : null))
          .filter(Boolean),
      ),
    ] as string[];

    const [clients, managers] = await Promise.all([
      clientIds.length
        ? AgencyClient.find({ _id: { $in: clientIds } }).select('name code').exec()
        : [],
      managerIds.length
        ? User.find({ _id: { $in: managerIds } }).select('firstName lastName email').exec()
        : [],
    ]);

    const clientById = new Map(clients.map((c) => [c.id, c]));
    const managerById = new Map(
      managers.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim() || u.email]),
    );

    return {
      items: items.map((item) => {
        const client = clientById.get(String(item.clientId));
        return this.toResponse(item, {
          clientName: client?.name,
          clientCode: client?.code,
          managerName: item.assignedManagerId
            ? managerById.get(String(item.assignedManagerId))
            : undefined,
        });
      }),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getById(id: string, actor: ProjectActor): Promise<AgencyProjectResponse> {
    const project = await this.getOrThrow(id);
    this.assertScope(project, actor);
    const names = await this.resolveNames(project);
    return this.toResponse(project, names);
  }

  async create(dto: CreateProjectDto, actor: ProjectActor): Promise<AgencyProjectResponse> {
    const client = await this.assertClientExists(dto.clientId);
    await this.assertManagerExists(dto.assignedManagerId);

    const status: AgencyProjectStatus = dto.status ?? 'draft';
    if (status === 'completed' || status === 'archived') {
      throw new BadRequestError('New projects cannot start as completed or archived');
    }

    const code = await allocateAgencyDocumentCode('project');
    const milestones = this.mapMilestones(dto.milestones);
    const tasks = this.mapTasks(dto.tasks);
    const progressPercent = computeProgressPercent({
      milestones,
      tasks,
      progressPercent: dto.progressPercent,
    });

    const project = await AgencyProject.create({
      code,
      clientId: dto.clientId,
      name: dto.name.trim(),
      description: dto.description?.trim(),
      serviceCategory: dto.serviceCategory?.trim(),
      status,
      priority: dto.priority ?? 'medium',
      assignedManagerId: dto.assignedManagerId || null,
      startDate: dto.startDate || undefined,
      targetDeliveryDate: dto.targetDeliveryDate || undefined,
      completionDate: undefined,
      billingModel: dto.billingModel ?? 'fixed_price',
      contractValue: {
        amountMinor: dto.contractValue?.amountMinor ?? 0,
        currency: dto.contractValue?.currency ?? DEFAULT_AGENCY_CURRENCY,
      },
      estimatedCostMinor: dto.estimatedCostMinor ?? undefined,
      scope: this.buildScope(dto.scope),
      milestones,
      tasks,
      deliverables: this.mapDeliverables(dto.deliverables),
      dependencies: this.mapDependencies(dto.dependencies),
      progressPercent,
      stagingUrl: dto.stagingUrl?.trim() || undefined,
      productionUrl: dto.productionUrl?.trim() || undefined,
      warrantyDays: dto.warrantyDays ?? 30,
      postDeliveryObligations: dto.postDeliveryObligations?.trim(),
      quotationId: dto.quotationId || null,
      quotationCode: dto.quotationCode?.trim().toUpperCase() || undefined,
      invoiceIds: [],
      portfolioProjectId: dto.portfolioProjectId || null,
      tags: uniqueStrings(dto.tags),
      notes: dto.notes?.trim(),
      attachments: this.mapAttachments(dto.attachments, actor.id),
      activityLog: [
        this.buildActivity('created', 'Project created', actor, {
          code,
          clientId: client.id,
        }),
      ],
      isActive: statusToIsActive(status),
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });

    loggers.admin.info('Agency project created', {
      id: project.id,
      code,
      clientId: client.id,
      actorId: actor.id,
    });

    return this.toResponse(project, {
      clientName: client.name,
      clientCode: client.code,
    });
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    actor: ProjectActor,
  ): Promise<AgencyProjectResponse> {
    const existing = await this.getOrThrow(id);
    this.assertScope(existing, actor);
    if (existing.isDeleted) throw new BadRequestError('Cannot update a project in trash');
    if (existing.status === 'archived') {
      throw new BadRequestError('Archived projects cannot be edited');
    }

    if (dto.clientId && dto.clientId !== String(existing.clientId)) {
      await this.assertClientExists(dto.clientId);
    }
    if (dto.assignedManagerId !== undefined) {
      await this.assertManagerExists(dto.assignedManagerId);
    }

    this.assertScopeEditable(existing, dto);

    let nextStatus = existing.status;
    if (dto.status !== undefined && dto.status !== existing.status) {
      if (dto.status === 'archived') {
        throw new BadRequestError('Use the archive endpoint to archive a project');
      }
      assertValidStatusTransition(existing.status, dto.status);
      if (dto.status === 'completed') {
        const preview = {
          ...existing.toObject(),
          milestones: dto.milestones
            ? this.mapMilestones(dto.milestones)
            : existing.milestones,
          deliverables: dto.deliverables
            ? this.mapDeliverables(dto.deliverables)
            : existing.deliverables,
          progressPercent:
            dto.progressPercent ??
            computeProgressPercent({
              milestones: dto.milestones
                ? this.mapMilestones(dto.milestones)
                : existing.milestones,
              tasks: dto.tasks ? this.mapTasks(dto.tasks) : existing.tasks,
              progressPercent: existing.progressPercent,
            }),
          acceptanceRecords: existing.acceptanceRecords,
        } as IAgencyProject;
        assertCanComplete(preview);
      }
      nextStatus = dto.status;
    }

    const milestones =
      dto.milestones !== undefined ? this.mapMilestones(dto.milestones) : existing.milestones;
    const tasks = dto.tasks !== undefined ? this.mapTasks(dto.tasks) : existing.tasks;
    const progressPercent = computeProgressPercent({
      milestones,
      tasks,
      progressPercent:
        dto.progressPercent !== undefined ? dto.progressPercent : existing.progressPercent,
    });

    const updateData: Record<string, unknown> = {
      updatedBy: new Types.ObjectId(actor.id),
    };

    if (dto.clientId !== undefined) updateData.clientId = dto.clientId;
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.description !== undefined) updateData.description = dto.description?.trim();
    if (dto.serviceCategory !== undefined) {
      updateData.serviceCategory = dto.serviceCategory?.trim();
    }
    if (dto.status !== undefined) {
      updateData.status = nextStatus;
      updateData.isActive = statusToIsActive(nextStatus);
      if (nextStatus === 'completed') {
        updateData.completionDate = dto.completionDate || new Date();
      }
    }
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.assignedManagerId !== undefined) {
      updateData.assignedManagerId = dto.assignedManagerId || null;
    }
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate || null;
    if (dto.targetDeliveryDate !== undefined) {
      updateData.targetDeliveryDate = dto.targetDeliveryDate || null;
    }
    if (dto.completionDate !== undefined && nextStatus === 'completed') {
      updateData.completionDate = dto.completionDate || new Date();
    }
    if (dto.billingModel !== undefined) updateData.billingModel = dto.billingModel;
    if (dto.contractValue !== undefined) {
      updateData.contractValue = {
        amountMinor: dto.contractValue.amountMinor,
        currency: dto.contractValue.currency ?? existing.contractValue?.currency,
      };
    }
    if (dto.estimatedCostMinor !== undefined) {
      updateData.estimatedCostMinor = dto.estimatedCostMinor;
    }
    if (dto.scope !== undefined) {
      updateData.scope = {
        summary: dto.scope.summary?.trim(),
        items: uniqueStrings(dto.scope.items),
        version: existing.scope?.version ?? 1,
        isApproved: false,
      };
    }
    if (dto.milestones !== undefined) updateData.milestones = milestones;
    if (dto.tasks !== undefined) updateData.tasks = tasks;
    if (dto.deliverables !== undefined) {
      updateData.deliverables = this.mapDeliverables(dto.deliverables);
    }
    if (dto.dependencies !== undefined) {
      updateData.dependencies = this.mapDependencies(dto.dependencies);
    }
    updateData.progressPercent = progressPercent;
    if (dto.stagingUrl !== undefined) updateData.stagingUrl = dto.stagingUrl?.trim() || undefined;
    if (dto.productionUrl !== undefined) {
      updateData.productionUrl = dto.productionUrl?.trim() || undefined;
    }
    if (dto.warrantyDays !== undefined) updateData.warrantyDays = dto.warrantyDays;
    if (dto.postDeliveryObligations !== undefined) {
      updateData.postDeliveryObligations = dto.postDeliveryObligations?.trim();
    }
    if (dto.quotationId !== undefined) updateData.quotationId = dto.quotationId || null;
    if (dto.quotationCode !== undefined) {
      updateData.quotationCode = dto.quotationCode?.trim().toUpperCase() || undefined;
    }
    if (dto.portfolioProjectId !== undefined) {
      updateData.portfolioProjectId = dto.portfolioProjectId || null;
    }
    if (dto.tags !== undefined) updateData.tags = uniqueStrings(dto.tags);
    if (dto.notes !== undefined) updateData.notes = dto.notes?.trim();
    if (dto.attachments !== undefined) {
      updateData.attachments = this.mapAttachments(dto.attachments, actor.id);
    }

    const changes: string[] = [];
    if (dto.status && dto.status !== existing.status) changes.push(`status→${dto.status}`);
    if (dto.name && dto.name !== existing.name) changes.push('name');
    if (dto.milestones) changes.push('milestones');
    if (dto.tasks) changes.push('tasks');
    if (dto.scope) changes.push('scope');

    if (changes.length) {
      updateData.$push = {
        activityLog: this.buildActivity(
          dto.status && dto.status !== existing.status ? 'status_changed' : 'updated',
          `Project updated (${changes.join(', ')})`,
          actor,
          { changes },
        ),
      };
    }

    const updated = await AgencyProject.findByIdAndUpdate(
      id,
      updateData as UpdateQuery<IAgencyProject>,
      { new: true },
    ).exec();
    if (!updated) throw new NotFoundError('Project');

    loggers.admin.info('Agency project updated', { id, actorId: actor.id });
    const names = await this.resolveNames(updated);
    return this.toResponse(updated, names);
  }

  async transitionStatus(
    id: string,
    status: AgencyProjectStatus,
    actor: ProjectActor,
  ): Promise<AgencyProjectResponse> {
    return this.update(id, { status }, actor);
  }

  async archive(id: string, actor: ProjectActor): Promise<AgencyProjectResponse> {
    const project = await this.getOrThrow(id);
    this.assertScope(project, actor);
    if (project.isDeleted) throw new BadRequestError('Cannot archive a project in trash');
    if (project.status === 'archived') {
      throw new ConflictError('Project is already archived');
    }
    if (project.status !== 'completed' && project.status !== 'cancelled') {
      throw new BadRequestError(
        'Only completed or cancelled projects can be archived (safe archival)',
      );
    }

    const updated = await AgencyProject.findByIdAndUpdate(
      id,
      {
        status: 'archived',
        isActive: false,
        updatedBy: new Types.ObjectId(actor.id),
        $push: {
          activityLog: this.buildActivity('archived', 'Project archived', actor),
        },
      },
      { new: true },
    ).exec();
    if (!updated) throw new NotFoundError('Project');
    const names = await this.resolveNames(updated);
    return this.toResponse(updated, names);
  }

  async softDelete(id: string, actor: ProjectActor): Promise<void> {
    const project = await this.getOrThrow(id);
    this.assertScope(project, actor);
    if (project.isDeleted) throw new BadRequestError('Project is already in trash');

    await AgencyProject.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
      updatedBy: new Types.ObjectId(actor.id),
      $push: {
        activityLog: this.buildActivity('trashed', 'Project moved to trash', actor),
      },
    }).exec();
  }

  async restore(id: string, actor: ProjectActor): Promise<AgencyProjectResponse> {
    const project = await this.getOrThrow(id, true);
    this.assertScope(project, actor);
    if (!project.isDeleted) throw new BadRequestError('Project is not in trash');

    const restored = await AgencyProject.findByIdAndUpdate(
      id,
      {
        isDeleted: false,
        deletedAt: null,
        updatedBy: new Types.ObjectId(actor.id),
        $push: {
          activityLog: this.buildActivity('restored', 'Project restored from trash', actor),
        },
      },
      { new: true },
    )
      .setOptions({ includeDeleted: true })
      .exec();

    if (!restored) throw new NotFoundError('Project');
    const names = await this.resolveNames(restored);
    return this.toResponse(restored, names);
  }

  async addNote(id: string, note: string, actor: ProjectActor): Promise<AgencyProjectResponse> {
    const project = await this.getOrThrow(id);
    this.assertScope(project, actor);
    if (project.isDeleted) throw new BadRequestError('Cannot note a project in trash');

    const updated = await AgencyProject.findByIdAndUpdate(
      id,
      {
        updatedBy: new Types.ObjectId(actor.id),
        $push: {
          activityLog: this.buildActivity('note_added', note, actor),
        },
      },
      { new: true },
    ).exec();
    if (!updated) throw new NotFoundError('Project');
    const names = await this.resolveNames(updated);
    return this.toResponse(updated, names);
  }

  async approveScope(
    id: string,
    note: string | undefined,
    actor: ProjectActor,
  ): Promise<AgencyProjectResponse> {
    const project = await this.getOrThrow(id);
    this.assertScope(project, actor);
    if (project.isDeleted) throw new BadRequestError('Cannot approve scope on a trashed project');
    if (project.scope?.isApproved) throw new ConflictError('Scope is already approved');

    const approval: IProjectApproval = {
      key: newKey('apr'),
      type: 'scope',
      status: 'approved',
      note,
      decidedAt: new Date(),
      decidedBy: new Types.ObjectId(actor.id),
      decidedByName: actor.fullName,
    };

    const updated = await AgencyProject.findByIdAndUpdate(
      id,
      {
        updatedBy: new Types.ObjectId(actor.id),
        'scope.summary': project.scope?.summary,
        'scope.items': project.scope?.items ?? [],
        'scope.version': project.scope?.version ?? 1,
        'scope.isApproved': true,
        'scope.approvedAt': new Date(),
        'scope.approvedBy': new Types.ObjectId(actor.id),
        'scope.approvedByName': actor.fullName,
        $push: {
          approvals: approval,
          activityLog: this.buildActivity('scope_approved', 'Project scope approved', actor, {
            note,
          }),
        },
      },
      { new: true },
    ).exec();

    if (!updated) throw new NotFoundError('Project');
    const names = await this.resolveNames(updated);
    return this.toResponse(updated, names);
  }

  async createChangeRequest(
    id: string,
    payload: {
      title: string;
      description: string;
      proposedScopeSummary?: string;
      proposedScopeItems?: string[];
    },
    actor: ProjectActor,
  ): Promise<AgencyProjectResponse> {
    const project = await this.getOrThrow(id);
    this.assertScope(project, actor);
    if (project.isDeleted) throw new BadRequestError('Cannot change a trashed project');
    if (!project.scope?.isApproved) {
      throw new BadRequestError(
        'Change requests are only required after scope approval. Edit scope directly while unapproved.',
      );
    }

    const changeRequest: IProjectChangeRequest = {
      key: newKey('cr'),
      title: payload.title.trim(),
      description: payload.description.trim(),
      status: 'open',
      proposedScopeSummary: payload.proposedScopeSummary?.trim(),
      proposedScopeItems: uniqueStrings(payload.proposedScopeItems),
      requestedAt: new Date(),
      requestedBy: new Types.ObjectId(actor.id),
      requestedByName: actor.fullName,
    };

    const updated = await AgencyProject.findByIdAndUpdate(
      id,
      {
        updatedBy: new Types.ObjectId(actor.id),
        $push: {
          changeRequests: changeRequest,
          activityLog: this.buildActivity(
            'change_request_created',
            `Change request: ${changeRequest.title}`,
            actor,
            { key: changeRequest.key },
          ),
        },
      },
      { new: true },
    ).exec();

    if (!updated) throw new NotFoundError('Project');
    const names = await this.resolveNames(updated);
    return this.toResponse(updated, names);
  }

  async resolveChangeRequest(
    id: string,
    key: string,
    payload: {
      decision: 'approve' | 'reject';
      resolutionNote?: string;
      applyToScope?: boolean;
    },
    actor: ProjectActor,
  ): Promise<AgencyProjectResponse> {
    const project = await this.getOrThrow(id);
    this.assertScope(project, actor);
    const request = (project.changeRequests ?? []).find((item) => item.key === key);
    if (!request) throw new NotFoundError('Change request');
    if (request.status !== 'open') {
      throw new BadRequestError('Only open change requests can be resolved');
    }

    const apply = payload.decision === 'approve' && payload.applyToScope !== false;
    const nextRequests = (project.changeRequests ?? []).map((item) => {
      if (item.key !== key) return item;
      return {
        ...item,
        status: (payload.decision === 'approve'
          ? apply
            ? 'applied'
            : 'approved'
          : 'rejected') as IProjectChangeRequest['status'],
        resolvedAt: new Date(),
        resolvedByName: actor.fullName,
        resolutionNote: payload.resolutionNote?.trim(),
      };
    });

    const updateData: Record<string, unknown> = {
      changeRequests: nextRequests,
      updatedBy: new Types.ObjectId(actor.id),
      $push: {
        approvals: {
          key: newKey('apr'),
          type: 'change_request',
          subjectKey: key,
          status: payload.decision === 'approve' ? 'approved' : 'rejected',
          note: payload.resolutionNote,
          decidedAt: new Date(),
          decidedBy: new Types.ObjectId(actor.id),
          decidedByName: actor.fullName,
        } satisfies IProjectApproval,
        activityLog: this.buildActivity(
          'change_request_resolved',
          `Change request ${key} ${payload.decision}d`,
          actor,
          { key, apply },
        ),
      },
    };

    if (apply) {
      updateData.scope = {
        summary: request.proposedScopeSummary ?? project.scope?.summary,
        items: request.proposedScopeItems?.length
          ? request.proposedScopeItems
          : project.scope?.items ?? [],
        version: (project.scope?.version ?? 1) + 1,
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: new Types.ObjectId(actor.id),
        approvedByName: actor.fullName,
      };
    }

    const updated = await AgencyProject.findByIdAndUpdate(id, updateData, { new: true }).exec();
    if (!updated) throw new NotFoundError('Project');
    const names = await this.resolveNames(updated);
    return this.toResponse(updated, names);
  }

  async addAcceptance(
    id: string,
    notes: string | undefined,
    actor: ProjectActor,
  ): Promise<AgencyProjectResponse> {
    const project = await this.getOrThrow(id);
    this.assertScope(project, actor);
    if (project.isDeleted) throw new BadRequestError('Cannot accept a trashed project');

    const record: IProjectAcceptance = {
      key: newKey('acc'),
      notes: notes?.trim(),
      acceptedAt: new Date(),
      acceptedBy: new Types.ObjectId(actor.id),
      acceptedByName: actor.fullName,
    };

    const updated = await AgencyProject.findByIdAndUpdate(
      id,
      {
        updatedBy: new Types.ObjectId(actor.id),
        $push: {
          acceptanceRecords: record,
          approvals: {
            key: newKey('apr'),
            type: 'acceptance',
            subjectKey: record.key,
            status: 'approved',
            note: notes,
            decidedAt: new Date(),
            decidedBy: new Types.ObjectId(actor.id),
            decidedByName: actor.fullName,
          } satisfies IProjectApproval,
          activityLog: this.buildActivity(
            'acceptance_recorded',
            'Client acceptance recorded',
            actor,
          ),
        },
      },
      { new: true },
    ).exec();

    if (!updated) throw new NotFoundError('Project');
    const names = await this.resolveNames(updated);
    return this.toResponse(updated, names);
  }
}

export const projectService = new ProjectService();
