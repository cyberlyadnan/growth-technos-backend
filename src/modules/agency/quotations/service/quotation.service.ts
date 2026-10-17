import { Types, type UpdateQuery } from 'mongoose';
import { BadRequestError, ConflictError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import { UserRole } from '@core/constants';
import { DEFAULT_AGENCY_CURRENCY, type CurrencyCode } from '@core/utils/money';
import { AgencyClient } from '@modules/agency/clients/model/client.model';
import { allocateAgencyDocumentCode } from '@modules/agency/clients/service/number-sequence.service';
import { AgencyProject } from '@modules/agency/projects/model/project.model';
import { projectService } from '@modules/agency/projects/service/project.service';
import {
  AgencyQuotation,
  IAgencyQuotation,
  IQuotationActivity,
  IQuotationLine,
  IQuotationSnapshot,
  QuotationStatus,
} from '../model/quotation.model';
import { QuotationCatalogItem } from '../model/catalog-item.model';
import { QuotationTemplate } from '../model/template.model';
import {
  calculateQuotationTotals,
  type LineItemInput,
  type TaxConfigInput,
} from './quotation-calc';
import { buildQuotationPdfBuffer } from './quotation-pdf.service';

type Filter = Record<string, unknown>;

export type QuotationActor = {
  id: string;
  role: UserRole | string;
  fullName?: string;
};

export type CreateQuotationDto = {
  clientId: string;
  projectId?: string | null;
  title: string;
  issueDate?: Date | null;
  expiryDate?: Date | null;
  validityDays?: number;
  currency?: CurrencyCode;
  taxConfig?: TaxConfigInput;
  documentDiscountPercent?: number;
  documentDiscountMinor?: number;
  lineItems: LineItemInput[];
  scopeOfWork?: string;
  exclusions?: string;
  assumptions?: string;
  deliveryTimeline?: string;
  paymentMilestones?: string;
  terms?: string;
  internalNotes?: string;
  templateId?: string | null;
};

export type UpdateQuotationDto = Partial<CreateQuotationDto>;

export type ListQuotationsQuery = PaginationQuery & {
  search?: string;
  status?: QuotationStatus;
  clientId?: string;
  projectId?: string;
  documentGroupId?: string;
  includeTrash?: boolean;
  trashOnly?: boolean;
};

const EDITABLE: QuotationStatus[] = ['draft'];
const ISSUABLE: QuotationStatus[] = ['draft'];
const DECIDABLE: QuotationStatus[] = ['issued'];
const REVISABLE: QuotationStatus[] = ['issued', 'accepted', 'rejected', 'expired'];

export class QuotationService {
  private buildActivity(
    type: string,
    message: string,
    actor: QuotationActor,
    meta?: Record<string, unknown>,
  ): IQuotationActivity {
    return {
      type,
      message,
      meta,
      createdBy: new Types.ObjectId(actor.id),
      createdByName: actor.fullName,
      createdAt: new Date(),
    };
  }

  private async getOrThrow(id: string, includeDeleted = false): Promise<IAgencyQuotation> {
    const query = AgencyQuotation.findById(id);
    if (includeDeleted) query.setOptions({ includeDeleted: true });
    const doc = await query.exec();
    if (!doc) throw new NotFoundError('Quotation');
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

  private computeExpiry(
    issueDate: Date | undefined,
    expiryDate: Date | null | undefined,
    validityDays: number,
  ): Date | undefined {
    if (expiryDate) return expiryDate;
    if (!issueDate) return undefined;
    const expiry = new Date(issueDate);
    expiry.setUTCDate(expiry.getUTCDate() + validityDays);
    return expiry;
  }

  private maybeExpire(doc: IAgencyQuotation): IAgencyQuotation {
    if (
      doc.status === 'issued' &&
      doc.expiryDate &&
      doc.expiryDate.getTime() < Date.now()
    ) {
      doc.status = 'expired';
      doc.isActive = false;
    }
    return doc;
  }

  private applyTotals(doc: IAgencyQuotation, dto: {
    currency?: CurrencyCode;
    taxConfig?: TaxConfigInput;
    lineItems: LineItemInput[];
    documentDiscountPercent?: number;
    documentDiscountMinor?: number;
  }) {
    const totals = calculateQuotationTotals({
      currency: dto.currency ?? (doc.currency as CurrencyCode) ?? DEFAULT_AGENCY_CURRENCY,
      taxConfig: dto.taxConfig ?? {
        mode: doc.taxConfig?.mode ?? 'exclusive',
        rates: doc.taxConfig?.rates ?? [],
      },
      lineItems: dto.lineItems,
      documentDiscountPercent: dto.documentDiscountPercent ?? doc.documentDiscountPercent,
      documentDiscountMinor: dto.documentDiscountMinor ?? doc.documentDiscountMinor,
    });

    doc.currency = totals.currency;
    doc.lineItems = totals.lines as IQuotationLine[];
    doc.subtotalMinor = totals.subtotalMinor;
    doc.discountTotalMinor = totals.discountTotalMinor;
    doc.taxMinor = totals.taxMinor;
    doc.grandTotalMinor = totals.grandTotalMinor;
    doc.taxBreakdown = totals.taxBreakdown;
    if (dto.taxConfig) doc.taxConfig = dto.taxConfig;
    if (dto.documentDiscountPercent !== undefined) {
      doc.documentDiscountPercent = dto.documentDiscountPercent;
    }
    if (dto.documentDiscountMinor !== undefined) {
      doc.documentDiscountMinor = dto.documentDiscountMinor;
    }
    return totals;
  }

  private toSnapshot(doc: IAgencyQuotation, actor: QuotationActor, note?: string): IQuotationSnapshot {
    return {
      version: doc.version,
      code: doc.code,
      status: doc.status,
      title: doc.title,
      issueDate: doc.issueDate,
      expiryDate: doc.expiryDate,
      currency: doc.currency as CurrencyCode,
      taxConfig: {
        mode: doc.taxConfig.mode,
        rates: [...(doc.taxConfig.rates ?? [])],
      },
      lineItems: JSON.parse(JSON.stringify(doc.lineItems ?? [])) as IQuotationLine[],
      subtotalMinor: doc.subtotalMinor,
      discountTotalMinor: doc.discountTotalMinor,
      taxMinor: doc.taxMinor,
      grandTotalMinor: doc.grandTotalMinor,
      taxBreakdown: [...(doc.taxBreakdown ?? [])],
      scopeOfWork: doc.scopeOfWork,
      exclusions: doc.exclusions,
      assumptions: doc.assumptions,
      deliveryTimeline: doc.deliveryTimeline,
      paymentMilestones: doc.paymentMilestones,
      terms: doc.terms,
      frozenAt: new Date(),
      frozenByName: actor.fullName,
      note,
    };
  }

  private toResponse(doc: IAgencyQuotation, extras?: {
    clientName?: string;
    clientCode?: string;
    projectName?: string;
    projectCode?: string;
  }) {
    this.maybeExpire(doc);
    return {
      id: doc.id,
      code: doc.code,
      documentGroupId: String(doc.documentGroupId),
      version: doc.version,
      previousVersionId: doc.previousVersionId ? String(doc.previousVersionId) : null,
      supersededById: doc.supersededById ? String(doc.supersededById) : null,
      clientId: String(doc.clientId),
      clientName: extras?.clientName,
      clientCode: extras?.clientCode,
      projectId: doc.projectId ? String(doc.projectId) : null,
      projectName: extras?.projectName,
      projectCode: extras?.projectCode,
      title: doc.title,
      status: doc.status,
      issueDate: doc.issueDate?.toISOString(),
      expiryDate: doc.expiryDate?.toISOString(),
      validityDays: doc.validityDays,
      currency: doc.currency,
      taxConfig: doc.taxConfig,
      documentDiscountPercent: doc.documentDiscountPercent,
      documentDiscountMinor: doc.documentDiscountMinor,
      lineItems: doc.lineItems,
      subtotalMinor: doc.subtotalMinor,
      discountTotalMinor: doc.discountTotalMinor,
      taxMinor: doc.taxMinor,
      grandTotalMinor: doc.grandTotalMinor,
      taxBreakdown: doc.taxBreakdown,
      scopeOfWork: doc.scopeOfWork,
      exclusions: doc.exclusions,
      assumptions: doc.assumptions,
      deliveryTimeline: doc.deliveryTimeline,
      paymentMilestones: doc.paymentMilestones,
      terms: doc.terms,
      internalNotes: doc.internalNotes,
      templateId: doc.templateId ? String(doc.templateId) : null,
      versionHistory: (doc.versionHistory ?? []).map((snap) => ({
        id: (snap as IQuotationSnapshot & { id?: string }).id,
        version: snap.version,
        code: snap.code,
        status: snap.status,
        title: snap.title,
        issueDate: snap.issueDate?.toISOString?.(),
        expiryDate: snap.expiryDate?.toISOString?.(),
        currency: snap.currency,
        subtotalMinor: snap.subtotalMinor,
        taxMinor: snap.taxMinor,
        grandTotalMinor: snap.grandTotalMinor,
        frozenAt: snap.frozenAt?.toISOString?.() ?? new Date(snap.frozenAt).toISOString(),
        frozenByName: snap.frozenByName,
        note: snap.note,
      })),
      convertedProjectId: doc.convertedProjectId ? String(doc.convertedProjectId) : null,
      invoiceReady: doc.invoiceReady,
      invoiceReadyAt: doc.invoiceReadyAt?.toISOString(),
      acceptedAt: doc.acceptedAt?.toISOString(),
      rejectedAt: doc.rejectedAt?.toISOString(),
      rejectionReason: doc.rejectionReason,
      activityLog: [...(doc.activityLog ?? [])]
        .slice()
        .reverse()
        .map((entry) => ({
          id: (entry as IQuotationActivity & { id?: string; _id?: Types.ObjectId }).id
            ?? ((entry as { _id?: Types.ObjectId })._id
              ? String((entry as { _id?: Types.ObjectId })._id)
              : undefined),
          type: entry.type,
          message: entry.message,
          meta: entry.meta,
          createdByName: entry.createdByName,
          createdAt: entry.createdAt?.toISOString?.() ?? new Date(entry.createdAt).toISOString(),
        })),
      isActive: doc.isActive,
      isDeleted: doc.isDeleted,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  private async resolveExtras(doc: IAgencyQuotation) {
    const [client, project] = await Promise.all([
      AgencyClient.findById(doc.clientId).select('name code').exec(),
      doc.projectId
        ? AgencyProject.findById(doc.projectId).select('name code').exec()
        : null,
    ]);
    return {
      clientName: client?.name,
      clientCode: client?.code,
      projectName: project?.name,
      projectCode: project?.code,
    };
  }

  previewTotals(input: {
    currency?: CurrencyCode;
    taxConfig: TaxConfigInput;
    lineItems: LineItemInput[];
    documentDiscountPercent?: number;
    documentDiscountMinor?: number;
  }) {
    return calculateQuotationTotals(input);
  }

  async list(query: ListQuotationsQuery, _actor: QuotationActor) {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'createdAt',
      order: query.order ?? 'desc',
    });

    let filter: Filter = {
      ...buildSearchFilter(query.search, ['title', 'code', 'internalNotes']),
    };
    if (query.trashOnly) filter.isDeleted = true;
    else if (!query.includeTrash) filter.isDeleted = { $ne: true };
    if (query.status) filter.status = query.status;
    if (query.clientId) filter.clientId = query.clientId;
    if (query.projectId) filter.projectId = query.projectId;
    if (query.documentGroupId) filter.documentGroupId = query.documentGroupId;

    const findQuery = AgencyQuotation.find(filter).sort(sort).skip(skip).limit(limit);
    const countQuery = AgencyQuotation.countDocuments(filter);
    if (query.trashOnly || query.includeTrash) {
      findQuery.setOptions({ includeDeleted: true });
      countQuery.setOptions({ includeDeleted: true });
    }

    const [items, total] = await Promise.all([findQuery.exec(), countQuery.exec()]);

    // Persist soft-expiry for issued past due
    await Promise.all(
      items
        .filter(
          (item) =>
            item.status === 'issued' &&
            item.expiryDate &&
            item.expiryDate.getTime() < Date.now(),
        )
        .map((item) =>
          AgencyQuotation.updateOne(
            { _id: item._id, status: 'issued' },
            { status: 'expired', isActive: false },
          ).exec(),
        ),
    );

    const clientIds = [...new Set(items.map((i) => String(i.clientId)))];
    const clients = clientIds.length
      ? await AgencyClient.find({ _id: { $in: clientIds } }).select('name code').exec()
      : [];
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    return {
      items: items.map((item) => {
        if (item.status === 'issued' && item.expiryDate && item.expiryDate.getTime() < Date.now()) {
          item.status = 'expired';
        }
        const client = clientMap.get(String(item.clientId));
        return this.toResponse(item, {
          clientName: client?.name,
          clientCode: client?.code,
        });
      }),
      meta: buildPaginationMeta(total, page, limit) as PaginationMeta,
    };
  }

  async getById(id: string, actor: QuotationActor) {
    const doc = await this.getOrThrow(id);
    if (
      doc.status === 'issued' &&
      doc.expiryDate &&
      doc.expiryDate.getTime() < Date.now()
    ) {
      doc.status = 'expired';
      doc.isActive = false;
      await doc.save();
    }
    void actor;
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async create(dto: CreateQuotationDto, actor: QuotationActor) {
    await this.assertClient(dto.clientId);
    await this.assertProject(dto.projectId, dto.clientId);

    if (dto.templateId) {
      const template = await QuotationTemplate.findById(dto.templateId).exec();
      if (!template || template.isDeleted) throw new BadRequestError('Template not found');
    }

    const code = await allocateAgencyDocumentCode('quotation');
    const documentGroupId = new Types.ObjectId();
    const validityDays = dto.validityDays ?? 15;
    const issueDate = dto.issueDate || undefined;
    const expiryDate = this.computeExpiry(issueDate, dto.expiryDate, validityDays);

    const doc = new AgencyQuotation({
      code,
      documentGroupId,
      version: 1,
      clientId: dto.clientId,
      projectId: dto.projectId || null,
      title: dto.title.trim(),
      status: 'draft',
      issueDate,
      expiryDate,
      validityDays,
      currency: dto.currency ?? DEFAULT_AGENCY_CURRENCY,
      taxConfig: dto.taxConfig ?? {
        mode: 'exclusive',
        rates: [{ name: 'GST', percent: 18 }],
      },
      documentDiscountPercent: dto.documentDiscountPercent ?? 0,
      documentDiscountMinor: dto.documentDiscountMinor ?? 0,
      scopeOfWork: dto.scopeOfWork,
      exclusions: dto.exclusions,
      assumptions: dto.assumptions,
      deliveryTimeline: dto.deliveryTimeline,
      paymentMilestones: dto.paymentMilestones,
      terms: dto.terms,
      internalNotes: dto.internalNotes,
      templateId: dto.templateId || null,
      invoiceReady: false,
      isActive: true,
      activityLog: [this.buildActivity('created', 'Quotation created', actor, { code })],
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });

    this.applyTotals(doc, {
      currency: dto.currency,
      taxConfig: dto.taxConfig,
      lineItems: dto.lineItems,
      documentDiscountPercent: dto.documentDiscountPercent,
      documentDiscountMinor: dto.documentDiscountMinor,
    });

    await doc.save();
    loggers.admin.info('Quotation created', { id: doc.id, code, actorId: actor.id });
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async update(id: string, dto: UpdateQuotationDto, actor: QuotationActor) {
    const doc = await this.getOrThrow(id);
    if (!EDITABLE.includes(doc.status)) {
      throw new BadRequestError('Only draft quotations can be edited. Create a revision instead.');
    }
    if (doc.isDeleted) throw new BadRequestError('Cannot edit a trashed quotation');

    if (dto.clientId) await this.assertClient(dto.clientId);
    await this.assertProject(
      dto.projectId !== undefined ? dto.projectId : doc.projectId ? String(doc.projectId) : null,
      dto.clientId ?? String(doc.clientId),
    );

    if (dto.clientId) doc.clientId = new Types.ObjectId(dto.clientId);
    if (dto.projectId !== undefined) {
      doc.projectId = dto.projectId ? new Types.ObjectId(dto.projectId) : null;
    }
    if (dto.title !== undefined) doc.title = dto.title.trim();
    if (dto.validityDays !== undefined) doc.validityDays = dto.validityDays;
    if (dto.issueDate !== undefined) doc.issueDate = dto.issueDate || undefined;
    if (dto.expiryDate !== undefined || dto.issueDate !== undefined || dto.validityDays !== undefined) {
      doc.expiryDate = this.computeExpiry(
        doc.issueDate,
        dto.expiryDate !== undefined ? dto.expiryDate : doc.expiryDate,
        doc.validityDays,
      );
    }
    if (dto.scopeOfWork !== undefined) doc.scopeOfWork = dto.scopeOfWork;
    if (dto.exclusions !== undefined) doc.exclusions = dto.exclusions;
    if (dto.assumptions !== undefined) doc.assumptions = dto.assumptions;
    if (dto.deliveryTimeline !== undefined) doc.deliveryTimeline = dto.deliveryTimeline;
    if (dto.paymentMilestones !== undefined) doc.paymentMilestones = dto.paymentMilestones;
    if (dto.terms !== undefined) doc.terms = dto.terms;
    if (dto.internalNotes !== undefined) doc.internalNotes = dto.internalNotes;
    if (dto.templateId !== undefined) {
      doc.templateId = dto.templateId ? new Types.ObjectId(dto.templateId) : null;
    }

    if (
      dto.lineItems ||
      dto.taxConfig ||
      dto.currency ||
      dto.documentDiscountPercent !== undefined ||
      dto.documentDiscountMinor !== undefined
    ) {
      this.applyTotals(doc, {
        currency: dto.currency,
        taxConfig: dto.taxConfig,
        lineItems: dto.lineItems ?? (doc.lineItems as unknown as LineItemInput[]),
        documentDiscountPercent: dto.documentDiscountPercent,
        documentDiscountMinor: dto.documentDiscountMinor,
      });
    }

    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(this.buildActivity('updated', 'Quotation updated', actor));
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async issue(id: string, actor: QuotationActor) {
    const doc = await this.getOrThrow(id);
    if (!ISSUABLE.includes(doc.status)) {
      throw new BadRequestError('Only draft quotations can be issued');
    }
    if (!doc.lineItems?.length) throw new BadRequestError('Cannot issue an empty quotation');

    const issueDate = doc.issueDate ?? new Date();
    doc.issueDate = issueDate;
    doc.expiryDate = this.computeExpiry(issueDate, doc.expiryDate, doc.validityDays);
    doc.status = 'issued';
    doc.isActive = true;
    doc.versionHistory.push(this.toSnapshot(doc, actor, 'Issued to client'));
    doc.activityLog.push(this.buildActivity('issued', 'Quotation issued', actor));
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async accept(id: string, actor: QuotationActor) {
    const doc = await this.getOrThrow(id);
    if (!DECIDABLE.includes(doc.status)) {
      throw new BadRequestError('Only issued quotations can be accepted');
    }
    doc.status = 'accepted';
    doc.acceptedAt = new Date();
    doc.isActive = true;
    doc.versionHistory.push(this.toSnapshot(doc, actor, 'Accepted by client'));
    doc.activityLog.push(this.buildActivity('accepted', 'Quotation accepted', actor));
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async reject(id: string, reason: string | undefined, actor: QuotationActor) {
    const doc = await this.getOrThrow(id);
    if (!DECIDABLE.includes(doc.status)) {
      throw new BadRequestError('Only issued quotations can be rejected');
    }
    doc.status = 'rejected';
    doc.rejectedAt = new Date();
    doc.rejectionReason = reason?.trim();
    doc.isActive = false;
    doc.versionHistory.push(this.toSnapshot(doc, actor, reason || 'Rejected'));
    doc.activityLog.push(
      this.buildActivity('rejected', 'Quotation rejected', actor, { reason }),
    );
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  /**
   * Creates a new draft revision without overwriting prior issued/accepted content.
   */
  async revise(id: string, note: string | undefined, actor: QuotationActor) {
    const previous = await this.getOrThrow(id);
    if (!REVISABLE.includes(previous.status)) {
      throw new BadRequestError(
        'Only issued, accepted, rejected, or expired quotations can be revised',
      );
    }

    previous.versionHistory.push(this.toSnapshot(previous, actor, note || 'Superseded by revision'));
    const code = await allocateAgencyDocumentCode('quotation');
    const nextVersion = previous.version + 1;

    const revision = await AgencyQuotation.create({
      code,
      documentGroupId: previous.documentGroupId,
      version: nextVersion,
      previousVersionId: previous._id,
      clientId: previous.clientId,
      projectId: previous.projectId,
      title: previous.title,
      status: 'draft',
      validityDays: previous.validityDays,
      currency: previous.currency,
      taxConfig: previous.taxConfig,
      documentDiscountPercent: previous.documentDiscountPercent,
      documentDiscountMinor: previous.documentDiscountMinor,
      lineItems: previous.lineItems,
      subtotalMinor: previous.subtotalMinor,
      discountTotalMinor: previous.discountTotalMinor,
      taxMinor: previous.taxMinor,
      grandTotalMinor: previous.grandTotalMinor,
      taxBreakdown: previous.taxBreakdown,
      scopeOfWork: previous.scopeOfWork,
      exclusions: previous.exclusions,
      assumptions: previous.assumptions,
      deliveryTimeline: previous.deliveryTimeline,
      paymentMilestones: previous.paymentMilestones,
      terms: previous.terms,
      internalNotes: previous.internalNotes,
      templateId: previous.templateId,
      versionHistory: [],
      invoiceReady: false,
      isActive: true,
      activityLog: [
        this.buildActivity('revision_created', `Revision v${nextVersion} created from ${previous.code}`, actor, {
          previousId: previous.id,
          note,
        }),
      ],
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });

    previous.status = 'revised';
    previous.supersededById = revision._id as Types.ObjectId;
    previous.isActive = false;
    previous.activityLog.push(
      this.buildActivity('revised', `Superseded by ${revision.code}`, actor, {
        revisionId: revision.id,
      }),
    );
    previous.updatedBy = new Types.ObjectId(actor.id);
    await previous.save();

    const extras = await this.resolveExtras(revision);
    return this.toResponse(revision, extras);
  }

  async convertToProject(
    id: string,
    options: { name?: string; billingModel?: string },
    actor: QuotationActor,
  ) {
    const doc = await this.getOrThrow(id);
    if (doc.status !== 'accepted') {
      throw new BadRequestError('Only accepted quotations can be converted to a project');
    }
    if (doc.convertedProjectId) {
      const existing = await AgencyProject.findById(doc.convertedProjectId).exec();
      if (existing && !existing.isDeleted) {
        throw new ConflictError(
          `Quotation already linked to project ${existing.code} (${existing.id})`,
        );
      }
    }
    if (doc.projectId) {
      const linked = await AgencyProject.findById(doc.projectId).exec();
      if (linked && !linked.isDeleted) {
        doc.convertedProjectId = linked._id as Types.ObjectId;
        doc.activityLog.push(
          this.buildActivity(
            'linked_existing_project',
            `Linked to existing project ${linked.code}`,
            actor,
          ),
        );
        await doc.save();
        const extras = await this.resolveExtras(doc);
        return { quotation: this.toResponse(doc, extras), projectId: linked.id, created: false };
      }
    }

    const project = await projectService.create(
      {
        clientId: String(doc.clientId),
        name: options.name?.trim() || doc.title,
        description: doc.scopeOfWork,
        status: 'planned',
        billingModel: (options.billingModel as 'fixed_price') || 'fixed_price',
        contractValue: {
          amountMinor: doc.grandTotalMinor,
          currency: doc.currency as CurrencyCode,
        },
        quotationId: doc.id,
        quotationCode: doc.code,
        scope: {
          summary: doc.scopeOfWork,
          items: doc.lineItems.map((line) => line.description),
        },
        notes: `Created from accepted quotation ${doc.code}`,
      },
      actor,
    );

    doc.convertedProjectId = new Types.ObjectId(project.id);
    doc.projectId = new Types.ObjectId(project.id);
    doc.activityLog.push(
      this.buildActivity('converted_to_project', `Converted to project ${project.code}`, actor, {
        projectId: project.id,
      }),
    );
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();

    const extras = await this.resolveExtras(doc);
    return { quotation: this.toResponse(doc, extras), projectId: project.id, created: true };
  }

  async markInvoiceReady(id: string, actor: QuotationActor) {
    const doc = await this.getOrThrow(id);
    if (doc.status !== 'accepted') {
      throw new BadRequestError('Only accepted quotations can be marked invoice-ready');
    }
    doc.invoiceReady = true;
    doc.invoiceReadyAt = new Date();
    doc.activityLog.push(
      this.buildActivity(
        'invoice_ready',
        'Marked invoice-ready (no invoice created in this phase)',
        actor,
      ),
    );
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async addNote(id: string, note: string, actor: QuotationActor) {
    const doc = await this.getOrThrow(id);
    doc.activityLog.push(this.buildActivity('note_added', note, actor));
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async softDelete(id: string, actor: QuotationActor) {
    const doc = await this.getOrThrow(id);
    if (doc.status === 'accepted') {
      throw new BadRequestError('Accepted quotations cannot be trashed; revise or archive via status');
    }
    await AgencyQuotation.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
      updatedBy: new Types.ObjectId(actor.id),
      $push: {
        activityLog: this.buildActivity('trashed', 'Quotation moved to trash', actor),
      },
    } as UpdateQuery<IAgencyQuotation>).exec();
  }

  async restore(id: string, actor: QuotationActor) {
    const doc = await this.getOrThrow(id, true);
    if (!doc.isDeleted) throw new BadRequestError('Quotation is not in trash');
    const restored = await AgencyQuotation.findByIdAndUpdate(
      id,
      {
        isDeleted: false,
        deletedAt: null,
        updatedBy: new Types.ObjectId(actor.id),
        $push: {
          activityLog: this.buildActivity('restored', 'Quotation restored', actor),
        },
      },
      { new: true },
    )
      .setOptions({ includeDeleted: true })
      .exec();
    if (!restored) throw new NotFoundError('Quotation');
    const extras = await this.resolveExtras(restored);
    return this.toResponse(restored, extras);
  }

  async generatePdf(id: string, _actor: QuotationActor): Promise<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  }> {
    const doc = await this.getOrThrow(id);
    const client = await this.assertClient(String(doc.clientId));
    const buffer = await buildQuotationPdfBuffer(doc, {
      name: client.name,
      code: client.code,
      email: client.email,
      phone: client.phone,
      legalName: client.legalName,
    });
    return {
      buffer,
      filename: `${doc.code}.pdf`,
      contentType: 'application/pdf',
    };
  }

  // —— Catalog ——
  async listCatalog(query: PaginationQuery & { search?: string; category?: string; isActive?: boolean }) {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'name',
      order: query.order ?? 'asc',
    });
    const filter: Filter = {
      isDeleted: { $ne: true },
      ...buildSearchFilter(query.search, ['name', 'description', 'category']),
    };
    if (query.category) filter.category = query.category;
    if (query.isActive !== undefined) filter.isActive = query.isActive;
    const [items, total] = await Promise.all([
      QuotationCatalogItem.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      QuotationCatalogItem.countDocuments(filter).exec(),
    ]);
    return {
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        unit: item.unit,
        unitPriceMinor: item.unitPriceMinor,
        currency: item.currency,
        serviceId: item.serviceId ? String(item.serviceId) : null,
        category: item.category,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async createCatalogItem(
    dto: {
      name: string;
      description?: string;
      unit?: string;
      unitPriceMinor: number;
      currency?: CurrencyCode;
      serviceId?: string | null;
      category?: string;
      isActive?: boolean;
    },
    actor: QuotationActor,
  ) {
    const item = await QuotationCatalogItem.create({
      ...dto,
      currency: dto.currency ?? DEFAULT_AGENCY_CURRENCY,
      serviceId: dto.serviceId || null,
      isActive: dto.isActive ?? true,
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      unit: item.unit,
      unitPriceMinor: item.unitPriceMinor,
      currency: item.currency,
      serviceId: item.serviceId ? String(item.serviceId) : null,
      category: item.category,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  async updateCatalogItem(
    id: string,
    dto: Partial<{
      name: string;
      description?: string;
      unit?: string;
      unitPriceMinor: number;
      currency?: CurrencyCode;
      serviceId?: string | null;
      category?: string;
      isActive?: boolean;
    }>,
    actor: QuotationActor,
  ) {
    const item = await QuotationCatalogItem.findByIdAndUpdate(
      id,
      { ...dto, updatedBy: new Types.ObjectId(actor.id) },
      { new: true },
    ).exec();
    if (!item) throw new NotFoundError('Catalog item');
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      unit: item.unit,
      unitPriceMinor: item.unitPriceMinor,
      currency: item.currency,
      serviceId: item.serviceId ? String(item.serviceId) : null,
      category: item.category,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  // —— Templates ——
  async listTemplates(query: PaginationQuery & { search?: string; isActive?: boolean }) {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'name',
      order: query.order ?? 'asc',
    });
    const filter: Filter = {
      isDeleted: { $ne: true },
      ...buildSearchFilter(query.search, ['name', 'description']),
    };
    if (query.isActive !== undefined) filter.isActive = query.isActive;
    const [items, total] = await Promise.all([
      QuotationTemplate.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      QuotationTemplate.countDocuments(filter).exec(),
    ]);
    return {
      items: items.map((item) => this.mapTemplate(item)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getTemplate(id: string) {
    const item = await QuotationTemplate.findById(id).exec();
    if (!item || item.isDeleted) throw new NotFoundError('Template');
    return this.mapTemplate(item);
  }

  private mapTemplate(item: InstanceType<typeof QuotationTemplate>) {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      titleDefault: item.titleDefault,
      currency: item.currency,
      taxConfig: item.taxConfig,
      lineItems: item.lineItems,
      scopeOfWork: item.scopeOfWork,
      exclusions: item.exclusions,
      assumptions: item.assumptions,
      deliveryTimeline: item.deliveryTimeline,
      paymentMilestones: item.paymentMilestones,
      terms: item.terms,
      validityDays: item.validityDays,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  async createTemplate(
    dto: Record<string, unknown>,
    actor: QuotationActor,
  ) {
    const item = await QuotationTemplate.create({
      ...dto,
      currency: (dto.currency as CurrencyCode) ?? DEFAULT_AGENCY_CURRENCY,
      taxConfig: dto.taxConfig ?? {
        mode: 'exclusive',
        rates: [{ name: 'GST', percent: 18 }],
      },
      validityDays: (dto.validityDays as number) ?? 15,
      isActive: (dto.isActive as boolean) ?? true,
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });
    return this.mapTemplate(item);
  }

  async updateTemplate(id: string, dto: Record<string, unknown>, actor: QuotationActor) {
    const item = await QuotationTemplate.findByIdAndUpdate(
      id,
      { ...dto, updatedBy: new Types.ObjectId(actor.id) },
      { new: true },
    ).exec();
    if (!item) throw new NotFoundError('Template');
    return this.mapTemplate(item);
  }
}

export const quotationService = new QuotationService();
