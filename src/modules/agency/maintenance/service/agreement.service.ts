import { Types } from 'mongoose';
import { BadRequestError, ConflictError, NotFoundError } from '@core/errors';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import { UserRole } from '@core/constants';
import { DEFAULT_AGENCY_CURRENCY, type CurrencyCode } from '@core/utils/money';
import { AgencyClient } from '@modules/agency/clients/model/client.model';
import { allocateAgencyDocumentCode } from '@modules/agency/clients/service/number-sequence.service';
import { AgencyProject } from '@modules/agency/projects/model/project.model';
import { AgencyInvoice } from '@modules/agency/billing/model/invoice.model';
import { AgencyExpense } from '@modules/agency/expenses/model/expense.model';
import { invoiceService, type BillingActor } from '@modules/agency/billing/service/invoice.service';
import {
  AgreementStatus,
  BillingFrequency,
  IAgreementActivity,
  IMaintenanceAgreement,
  MaintenanceAgreement,
} from '../model/agreement.model';
import { MaintenanceBillingSchedule } from '../model/billing-schedule.model';
import {
  advanceNextBillingDate,
  deriveAgreementStatus,
  periodForDate,
} from './period.util';

type Filter = Record<string, unknown>;

export type MaintenanceActor = {
  id: string;
  role: UserRole | string;
  fullName?: string;
};

export type CreateAgreementDto = {
  clientId: string;
  projectId?: string | null;
  planName: string;
  serviceCoverage: string;
  startDate: Date;
  endDate?: Date;
  renewalDate?: Date;
  billingFrequency: BillingFrequency;
  customIntervalDays?: number;
  recurringChargeMinor: number;
  currency?: CurrencyCode;
  hostingChargeMinor?: number;
  domainChargeMinor?: number;
  hostingIncluded?: boolean;
  domainIncluded?: boolean;
  includedWork?: string;
  limitations?: string;
  exclusions?: string;
  responseExpectations?: string;
  renewalTerms?: string;
  linkedAssetIds?: string[];
  status?: AgreementStatus;
};

export type UpdateAgreementDto = Partial<CreateAgreementDto>;

export type ListAgreementsQuery = PaginationQuery & {
  search?: string;
  clientId?: string;
  projectId?: string;
  status?: AgreementStatus;
  renewingBefore?: Date;
};

export class AgreementService {
  private buildActivity(
    type: string,
    message: string,
    actor: MaintenanceActor,
    meta?: Record<string, unknown>,
  ): IAgreementActivity {
    return {
      type,
      message,
      meta,
      createdBy: new Types.ObjectId(actor.id),
      createdByName: actor.fullName,
      createdAt: new Date(),
    };
  }

  private async getOrThrow(id: string): Promise<IMaintenanceAgreement> {
    const doc = await MaintenanceAgreement.findById(id).exec();
    if (!doc || doc.isDeleted) throw new NotFoundError('Maintenance agreement');
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

  private periodAmount(doc: IMaintenanceAgreement): number {
    let total = doc.recurringChargeMinor;
    if (!doc.hostingIncluded) total += doc.hostingChargeMinor ?? 0;
    if (!doc.domainIncluded) total += doc.domainChargeMinor ?? 0;
    return total;
  }

  private toResponse(
    doc: IMaintenanceAgreement,
    extras?: {
      clientName?: string;
      projectName?: string;
      financials?: {
        invoicedRevenueMinor: number;
        confirmedPaidMinor: number;
        linkedExpenseMinor: number;
        note: string;
      };
    },
  ) {
    const status = deriveAgreementStatus(doc.status, doc.endDate, doc.renewalDate) as AgreementStatus;
    return {
      id: doc.id,
      code: doc.code,
      clientId: String(doc.clientId),
      clientName: extras?.clientName,
      projectId: doc.projectId ? String(doc.projectId) : null,
      projectName: extras?.projectName,
      planName: doc.planName,
      serviceCoverage: doc.serviceCoverage,
      startDate: doc.startDate.toISOString(),
      endDate: doc.endDate?.toISOString(),
      renewalDate: doc.renewalDate?.toISOString(),
      billingFrequency: doc.billingFrequency,
      customIntervalDays: doc.customIntervalDays,
      recurringChargeMinor: doc.recurringChargeMinor,
      currency: doc.currency,
      hostingChargeMinor: doc.hostingChargeMinor,
      domainChargeMinor: doc.domainChargeMinor,
      hostingIncluded: doc.hostingIncluded,
      domainIncluded: doc.domainIncluded,
      periodChargeMinor: this.periodAmount(doc),
      includedWork: doc.includedWork,
      limitations: doc.limitations,
      exclusions: doc.exclusions,
      responseExpectations: doc.responseExpectations,
      renewalTerms: doc.renewalTerms,
      status,
      terminatedAt: doc.terminatedAt?.toISOString(),
      terminationReason: doc.terminationReason,
      nextBillingDate: doc.nextBillingDate?.toISOString(),
      linkedAssetIds: (doc.linkedAssetIds ?? []).map(String),
      financials: extras?.financials,
      activityLog: (doc.activityLog ?? []).map((a) => ({
        id: String((a as { _id?: Types.ObjectId })._id ?? ''),
        type: a.type,
        message: a.message,
        createdByName: a.createdByName,
        createdAt: a.createdAt.toISOString(),
      })),
      isActive: doc.isActive,
      isDeleted: doc.isDeleted,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  private async resolveNames(doc: IMaintenanceAgreement) {
    const [client, project] = await Promise.all([
      AgencyClient.findById(doc.clientId).select('name').exec(),
      doc.projectId ? AgencyProject.findById(doc.projectId).select('name').exec() : null,
    ]);
    return { clientName: client?.name, projectName: project?.name };
  }

  private async financials(doc: IMaintenanceAgreement) {
    const invoiceMatch: Filter = {
      maintenanceAgreementId: doc._id,
      kind: 'invoice',
      status: { $nin: ['draft', 'cancelled'] },
      isDeleted: { $ne: true },
    };
    const invoices = await AgencyInvoice.find(invoiceMatch)
      .select('grandTotalMinor amountPaidMinor')
      .exec();
    const invoicedRevenueMinor = invoices.reduce((s, i) => s + (i.grandTotalMinor ?? 0), 0);
    const confirmedPaidMinor = invoices.reduce((s, i) => s + (i.amountPaidMinor ?? 0), 0);

    const expenseFilter: Filter = {
      status: { $in: ['recorded', 'finalized'] },
      isDeleted: { $ne: true },
      clientId: doc.clientId,
    };
    if (doc.projectId) expenseFilter.projectId = doc.projectId;
    const expenses = await AgencyExpense.find(expenseFilter).select('amountMinor').exec();
    const linkedExpenseMinor = expenses.reduce((s, e) => s + (e.amountMinor ?? 0), 0);

    return {
      invoicedRevenueMinor,
      confirmedPaidMinor,
      linkedExpenseMinor,
      note:
        'Revenue from issued/paid invoices linked to this agreement only. Costs are recorded/finalized expenses for the same client/project — not estimated.',
    };
  }

  async list(
    query: ListAgreementsQuery,
  ): Promise<{ items: ReturnType<AgreementService['toResponse']>[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'renewalDate',
      order: query.order ?? 'asc',
    });
    const filter: Filter = {
      isDeleted: { $ne: true },
      ...buildSearchFilter(query.search, ['code', 'planName', 'serviceCoverage']),
    };
    if (query.clientId) filter.clientId = new Types.ObjectId(query.clientId);
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.status) filter.status = query.status;
    if (query.renewingBefore) {
      filter.renewalDate = { $lte: query.renewingBefore };
      filter.status = { $in: ['active', 'expiring_soon'] };
    }

    const [docs, total] = await Promise.all([
      MaintenanceAgreement.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      MaintenanceAgreement.countDocuments(filter),
    ]);

    const clientIds = [...new Set(docs.map((d) => String(d.clientId)))];
    const clients = await AgencyClient.find({ _id: { $in: clientIds } }).select('name').exec();
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));

    return {
      items: docs.map((d) =>
        this.toResponse(d, { clientName: clientMap.get(String(d.clientId)) }),
      ),
      meta: buildPaginationMeta(total, page, limit) as PaginationMeta,
    };
  }

  async getById(id: string) {
    const doc = await this.getOrThrow(id);
    if (doc.status === 'active' || doc.status === 'expiring_soon') {
      const next = deriveAgreementStatus(doc.status, doc.endDate, doc.renewalDate) as AgreementStatus;
      if (next !== doc.status) {
        doc.status = next;
        await doc.save();
      }
    }
    const extras = await this.resolveNames(doc);
    const financials = await this.financials(doc);
    return this.toResponse(doc, { ...extras, financials });
  }

  async create(dto: CreateAgreementDto, actor: MaintenanceActor) {
    await this.assertClient(dto.clientId);
    await this.assertProject(dto.projectId, dto.clientId);
    if (dto.billingFrequency === 'custom' && !dto.customIntervalDays) {
      throw new BadRequestError('customIntervalDays is required for custom billing frequency');
    }
    const code = await allocateAgencyDocumentCode('maintenance');
    const status =
      (dto.status as AgreementStatus) ||
      (deriveAgreementStatus('active', dto.endDate, dto.renewalDate) as AgreementStatus);

    const doc = await MaintenanceAgreement.create({
      code,
      clientId: new Types.ObjectId(dto.clientId),
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      planName: dto.planName.trim(),
      serviceCoverage: dto.serviceCoverage.trim(),
      startDate: dto.startDate,
      endDate: dto.endDate,
      renewalDate: dto.renewalDate,
      billingFrequency: dto.billingFrequency,
      customIntervalDays: dto.customIntervalDays,
      recurringChargeMinor: dto.recurringChargeMinor,
      currency: dto.currency ?? DEFAULT_AGENCY_CURRENCY,
      hostingChargeMinor: dto.hostingChargeMinor ?? 0,
      domainChargeMinor: dto.domainChargeMinor ?? 0,
      hostingIncluded: dto.hostingIncluded ?? false,
      domainIncluded: dto.domainIncluded ?? false,
      includedWork: dto.includedWork?.trim(),
      limitations: dto.limitations?.trim(),
      exclusions: dto.exclusions?.trim(),
      responseExpectations: dto.responseExpectations?.trim(),
      renewalTerms: dto.renewalTerms?.trim(),
      status: status === 'expired' ? 'expired' : status === 'draft' ? 'draft' : 'active',
      nextBillingDate: dto.startDate,
      linkedAssetIds: (dto.linkedAssetIds ?? []).map((id) => new Types.ObjectId(id)),
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
      activityLog: [this.buildActivity('created', 'Maintenance agreement created', actor)],
    });

    const extras = await this.resolveNames(doc);
    return this.toResponse(doc, extras);
  }

  async update(id: string, dto: UpdateAgreementDto, actor: MaintenanceActor) {
    const doc = await this.getOrThrow(id);
    if (doc.status === 'terminated' || doc.status === 'cancelled') {
      throw new BadRequestError('Terminated or cancelled agreements cannot be edited');
    }
    if (dto.clientId && dto.clientId !== String(doc.clientId)) {
      await this.assertClient(dto.clientId);
      doc.clientId = new Types.ObjectId(dto.clientId);
    }
    const clientId = String(doc.clientId);
    if (dto.projectId !== undefined) {
      await this.assertProject(dto.projectId, clientId);
      doc.projectId = dto.projectId ? new Types.ObjectId(dto.projectId) : null;
    }
    if (dto.planName !== undefined) doc.planName = dto.planName.trim();
    if (dto.serviceCoverage !== undefined) doc.serviceCoverage = dto.serviceCoverage.trim();
    if (dto.startDate !== undefined) doc.startDate = dto.startDate;
    if (dto.endDate !== undefined) doc.endDate = dto.endDate;
    if (dto.renewalDate !== undefined) doc.renewalDate = dto.renewalDate;
    if (dto.billingFrequency !== undefined) doc.billingFrequency = dto.billingFrequency;
    if (dto.customIntervalDays !== undefined) doc.customIntervalDays = dto.customIntervalDays;
    if (dto.recurringChargeMinor !== undefined) doc.recurringChargeMinor = dto.recurringChargeMinor;
    if (dto.currency !== undefined) doc.currency = dto.currency;
    if (dto.hostingChargeMinor !== undefined) doc.hostingChargeMinor = dto.hostingChargeMinor;
    if (dto.domainChargeMinor !== undefined) doc.domainChargeMinor = dto.domainChargeMinor;
    if (dto.hostingIncluded !== undefined) doc.hostingIncluded = dto.hostingIncluded;
    if (dto.domainIncluded !== undefined) doc.domainIncluded = dto.domainIncluded;
    if (dto.includedWork !== undefined) doc.includedWork = dto.includedWork?.trim();
    if (dto.limitations !== undefined) doc.limitations = dto.limitations?.trim();
    if (dto.exclusions !== undefined) doc.exclusions = dto.exclusions?.trim();
    if (dto.responseExpectations !== undefined) {
      doc.responseExpectations = dto.responseExpectations?.trim();
    }
    if (dto.renewalTerms !== undefined) doc.renewalTerms = dto.renewalTerms?.trim();
    if (dto.linkedAssetIds !== undefined) {
      doc.linkedAssetIds = dto.linkedAssetIds.map((id) => new Types.ObjectId(id));
    }
    if (dto.status === 'draft' || dto.status === 'active') doc.status = dto.status;
    else {
      doc.status = deriveAgreementStatus(doc.status, doc.endDate, doc.renewalDate) as AgreementStatus;
    }
    if (doc.billingFrequency === 'custom' && !doc.customIntervalDays) {
      throw new BadRequestError('customIntervalDays is required for custom billing frequency');
    }
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(this.buildActivity('updated', 'Agreement updated', actor));
    await doc.save();
    const extras = await this.resolveNames(doc);
    return this.toResponse(doc, extras);
  }

  async activate(id: string, actor: MaintenanceActor) {
    const doc = await this.getOrThrow(id);
    if (doc.status === 'terminated' || doc.status === 'cancelled') {
      throw new BadRequestError('Cannot activate a terminated/cancelled agreement');
    }
    doc.status = deriveAgreementStatus('active', doc.endDate, doc.renewalDate) as AgreementStatus;
    if (!doc.nextBillingDate) doc.nextBillingDate = doc.startDate;
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(this.buildActivity('activated', 'Agreement activated', actor));
    await doc.save();
    return this.toResponse(doc, await this.resolveNames(doc));
  }

  async terminate(id: string, reason: string, actor: MaintenanceActor) {
    const doc = await this.getOrThrow(id);
    if (doc.status === 'terminated') throw new BadRequestError('Already terminated');
    doc.status = 'terminated';
    doc.terminatedAt = new Date();
    doc.terminationReason = reason.trim();
    doc.isActive = false;
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(this.buildActivity('terminated', `Terminated: ${reason.trim()}`, actor));
    await doc.save();
    return this.toResponse(doc, await this.resolveNames(doc));
  }

  async listSchedules(agreementId: string) {
    await this.getOrThrow(agreementId);
    const rows = await MaintenanceBillingSchedule.find({ agreementId })
      .sort({ periodStart: -1 })
      .exec();
    return rows.map((r) => ({
      id: r.id,
      periodKey: r.periodKey,
      periodStart: r.periodStart.toISOString(),
      periodEnd: r.periodEnd.toISOString(),
      amountMinor: r.amountMinor,
      currency: r.currency,
      status: r.status,
      invoiceId: r.invoiceId ? String(r.invoiceId) : null,
      invoiceCode: r.invoiceCode,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /**
   * Create a draft invoice for a billing period via existing invoiceService.
   * Never issues or charges. Duplicate period keys are rejected.
   */
  async generateDraftInvoice(
    agreementId: string,
    actor: MaintenanceActor,
    at: Date = new Date(),
  ) {
    const doc = await this.getOrThrow(agreementId);
    if (!['active', 'expiring_soon'].includes(doc.status)) {
      throw new BadRequestError('Only active agreements can generate billing drafts');
    }

    const period = periodForDate(
      doc.billingFrequency,
      at,
      doc.customIntervalDays,
      doc.startDate,
    );
    const amount = this.periodAmount(doc);
    if (amount <= 0) throw new BadRequestError('Period charge must be greater than zero');

    const existingSchedule = await MaintenanceBillingSchedule.findOne({
      agreementId: doc._id,
      periodKey: period.periodKey,
    }).exec();
    if (existingSchedule?.invoiceId) {
      throw new ConflictError(
        `Draft already exists for period ${period.periodKey} (${existingSchedule.invoiceCode})`,
      );
    }

    const billingActor: BillingActor = {
      id: actor.id,
      role: actor.role,
      fullName: actor.fullName,
    };

    const lineItems = [
      {
        description: `${doc.planName} — ${period.periodKey} maintenance`,
        quantity: 1,
        unitPriceMinor: doc.recurringChargeMinor,
      },
    ];
    if (!doc.hostingIncluded && (doc.hostingChargeMinor ?? 0) > 0) {
      lineItems.push({
        description: `Hosting — ${period.periodKey}`,
        quantity: 1,
        unitPriceMinor: doc.hostingChargeMinor,
      });
    }
    if (!doc.domainIncluded && (doc.domainChargeMinor ?? 0) > 0) {
      lineItems.push({
        description: `Domain — ${period.periodKey}`,
        quantity: 1,
        unitPriceMinor: doc.domainChargeMinor,
      });
    }

    const invoice = await invoiceService.create(
      {
        clientId: String(doc.clientId),
        projectId: doc.projectId ? String(doc.projectId) : null,
        maintenanceAgreementId: doc.id,
        maintenancePeriodKey: period.periodKey,
        title: `Maintenance ${doc.code} — ${period.periodKey}`,
        currency: doc.currency,
        indianTax: { treatment: 'none' },
        lineItems,
        internalNotes: `Auto-draft from maintenance agreement ${doc.code}; period ${period.periodKey}. Not issued/charged automatically.`,
        notes: 'Draft generated from maintenance schedule. Review and issue manually.',
      },
      billingActor,
    );

    try {
      await MaintenanceBillingSchedule.create({
        agreementId: doc._id,
        clientId: doc.clientId,
        periodKey: period.periodKey,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        amountMinor: amount,
        currency: doc.currency,
        status: 'draft_created',
        invoiceId: new Types.ObjectId(invoice.id),
        invoiceCode: invoice.code,
        notes: 'Draft invoice created — requires manual issue. No automatic charge.',
      });
    } catch {
      throw new ConflictError(`Billing schedule already exists for period ${period.periodKey}`);
    }

    doc.nextBillingDate = advanceNextBillingDate(
      doc.billingFrequency,
      period.periodEnd,
      doc.customIntervalDays,
    );
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(
      this.buildActivity(
        'billing_draft',
        `Draft invoice ${invoice.code} created for ${period.periodKey}`,
        actor,
        { invoiceId: invoice.id, periodKey: period.periodKey },
      ),
    );
    await doc.save();

    return {
      agreementId: doc.id,
      periodKey: period.periodKey,
      invoice,
      disclaimer:
        'Draft invoice only. Not issued, not charged, and not approved. Issue via the invoices module.',
    };
  }

  async renewalAlerts(withinDays = 30) {
    const before = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
    const docs = await MaintenanceAgreement.find({
      isDeleted: { $ne: true },
      status: { $in: ['active', 'expiring_soon'] },
      renewalDate: { $lte: before, $gte: new Date() },
    })
      .sort({ renewalDate: 1 })
      .limit(50)
      .exec();
    return docs.map((d) => this.toResponse(d));
  }
}

export const agreementService = new AgreementService();
