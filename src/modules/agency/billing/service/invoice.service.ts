import { Types, type ClientSession } from 'mongoose';
import { BadRequestError, ConflictError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import { UserRole } from '@core/constants';
import { DEFAULT_AGENCY_CURRENCY, type CurrencyCode } from '@core/utils/money';
import { AgencyClient } from '@modules/agency/clients/model/client.model';
import { allocateAgencyDocumentCode } from '@modules/agency/clients/service/number-sequence.service';
import { AgencyProject } from '@modules/agency/projects/model/project.model';
import { AgencyQuotation } from '@modules/agency/quotations/model/quotation.model';
import {
  AgencyInvoice,
  IAgencyInvoice,
  IInvoiceActivity,
  IInvoiceLine,
  InvoiceStatus,
} from '../model/invoice.model';
import {
  assertNonNegativeMinor,
  buildTaxConfigFromIndianSettings,
  calculateInvoiceTotals,
  type IndianTaxSettings,
  type LineItemInput,
  type TaxConfigInput,
} from './billing-calc';
import { buildInvoicePdfBuffer } from './invoice-pdf.service';

type Filter = Record<string, unknown>;

export type BillingActor = {
  id: string;
  role: UserRole | string;
  fullName?: string;
};

export type CreateInvoiceDto = {
  clientId: string;
  projectId?: string | null;
  quotationId?: string | null;
  title: string;
  issueDate?: Date | null;
  dueDate?: Date | null;
  paymentTermsDays?: number;
  currency?: CurrencyCode;
  taxConfig?: TaxConfigInput & {
    treatment?: IndianTaxSettings['treatment'];
    gstPercent?: number;
    placeOfSupplyState?: string;
    supplierState?: string;
  };
  indianTax?: IndianTaxSettings;
  documentDiscountPercent?: number;
  documentDiscountMinor?: number;
  lineItems: LineItemInput[];
  paymentTerms?: string;
  notes?: string;
  internalNotes?: string;
};

export type UpdateInvoiceDto = Partial<CreateInvoiceDto>;

export type ListInvoicesQuery = PaginationQuery & {
  search?: string;
  status?: InvoiceStatus;
  clientId?: string;
  projectId?: string;
  kind?: 'invoice' | 'credit_note';
  includeTrash?: boolean;
  trashOnly?: boolean;
};

const DRAFT_EDITABLE: InvoiceStatus[] = ['draft'];
const ISSUABLE: InvoiceStatus[] = ['draft'];
const OPEN_FOR_PAYMENT: InvoiceStatus[] = ['issued', 'partially_paid', 'overdue'];

function deriveBalanceStatus(
  balanceDueMinor: number,
  amountPaidMinor: number,
  dueDate?: Date,
  current: InvoiceStatus = 'issued',
): InvoiceStatus {
  if (current === 'cancelled' || current === 'credited') return current;
  if (balanceDueMinor <= 0 && amountPaidMinor > 0) return 'paid';
  if (amountPaidMinor > 0 && balanceDueMinor > 0) return 'partially_paid';
  if (
    balanceDueMinor > 0 &&
    dueDate &&
    dueDate.getTime() < Date.now() &&
    amountPaidMinor === 0
  ) {
    return 'overdue';
  }
  if (amountPaidMinor === 0 && balanceDueMinor > 0) {
    if (dueDate && dueDate.getTime() < Date.now()) return 'overdue';
    return 'issued';
  }
  return current === 'draft' ? 'draft' : 'issued';
}

export class InvoiceService {
  private buildActivity(
    type: string,
    message: string,
    actor: BillingActor,
    meta?: Record<string, unknown>,
  ): IInvoiceActivity {
    return {
      type,
      message,
      meta,
      createdBy: new Types.ObjectId(actor.id),
      createdByName: actor.fullName,
      createdAt: new Date(),
    };
  }

  private resolveTaxConfig(dto: {
    taxConfig?: CreateInvoiceDto['taxConfig'];
    indianTax?: IndianTaxSettings;
  }): TaxConfigInput & {
    treatment?: IndianTaxSettings['treatment'];
    gstPercent?: number;
    placeOfSupplyState?: string;
    supplierState?: string;
  } {
    if (dto.indianTax) {
      const built = buildTaxConfigFromIndianSettings(dto.indianTax);
      return {
        ...built,
        treatment: dto.indianTax.treatment,
        gstPercent: dto.indianTax.gstPercent,
        placeOfSupplyState: dto.indianTax.placeOfSupplyState,
        supplierState: dto.indianTax.supplierState,
      };
    }
    if (dto.taxConfig) return dto.taxConfig;
    return {
      mode: 'exclusive',
      rates: [
        { name: 'CGST', percent: 9 },
        { name: 'SGST', percent: 9 },
      ],
      treatment: 'intra_state',
      gstPercent: 18,
    };
  }

  private async getOrThrow(id: string, includeDeleted = false): Promise<IAgencyInvoice> {
    const query = AgencyInvoice.findById(id);
    if (includeDeleted) query.setOptions({ includeDeleted: true });
    const doc = await query.exec();
    if (!doc) throw new NotFoundError('Invoice');
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

  private computeDueDate(
    issueDate: Date | undefined,
    dueDate: Date | null | undefined,
    paymentTermsDays: number,
  ): Date | undefined {
    if (dueDate) return dueDate;
    if (!issueDate) return undefined;
    const due = new Date(issueDate);
    due.setUTCDate(due.getUTCDate() + paymentTermsDays);
    return due;
  }

  private applyTotals(
    doc: IAgencyInvoice,
    dto: {
      currency?: CurrencyCode;
      taxConfig: ReturnType<InvoiceService['resolveTaxConfig']>;
      lineItems: LineItemInput[];
      documentDiscountPercent?: number;
      documentDiscountMinor?: number;
    },
  ) {
    const totals = calculateInvoiceTotals({
      currency: dto.currency ?? (doc.currency as CurrencyCode) ?? DEFAULT_AGENCY_CURRENCY,
      taxConfig: {
        mode: dto.taxConfig.mode,
        rates: dto.taxConfig.rates,
      },
      lineItems: dto.lineItems,
      documentDiscountPercent: dto.documentDiscountPercent ?? doc.documentDiscountPercent,
      documentDiscountMinor: dto.documentDiscountMinor ?? doc.documentDiscountMinor,
    });

    doc.currency = totals.currency;
    doc.lineItems = totals.lines as IInvoiceLine[];
    doc.subtotalMinor = totals.subtotalMinor;
    doc.discountTotalMinor = totals.discountTotalMinor;
    doc.taxMinor = totals.taxMinor;
    doc.grandTotalMinor = totals.grandTotalMinor;
    doc.taxBreakdown = totals.taxBreakdown;
    doc.taxConfig = {
      mode: dto.taxConfig.mode,
      rates: dto.taxConfig.rates,
      treatment: dto.taxConfig.treatment,
      gstPercent: dto.taxConfig.gstPercent,
      placeOfSupplyState: dto.taxConfig.placeOfSupplyState,
      supplierState: dto.taxConfig.supplierState,
    };
    if (dto.documentDiscountPercent !== undefined) {
      doc.documentDiscountPercent = dto.documentDiscountPercent;
    }
    if (dto.documentDiscountMinor !== undefined) {
      doc.documentDiscountMinor = dto.documentDiscountMinor;
    }
    // Draft: paid/credited remaining zero; balance = grand total
    if (doc.status === 'draft') {
      doc.amountPaidMinor = 0;
      doc.amountCreditedMinor = 0;
      doc.balanceDueMinor = totals.grandTotalMinor;
    } else {
      this.recomputeBalance(doc);
    }
    return totals;
  }

  /** Recalculate balanceDue and status from paid/credited (posted invoices). */
  recomputeBalance(doc: IAgencyInvoice): void {
    const balance = Math.max(
      0,
      doc.grandTotalMinor - doc.amountPaidMinor - doc.amountCreditedMinor,
    );
    doc.balanceDueMinor = balance;
    if (doc.status !== 'cancelled' && doc.status !== 'draft') {
      if (doc.amountCreditedMinor >= doc.grandTotalMinor && doc.grandTotalMinor > 0) {
        doc.status = 'credited';
      } else {
        doc.status = deriveBalanceStatus(
          balance,
          doc.amountPaidMinor,
          doc.dueDate,
          doc.status,
        );
      }
    }
  }

  /**
   * Atomically apply a confirmed payment allocation using optimistic ledgerVersion.
   */
  async applyPaymentAllocation(
    invoiceId: string,
    amountMinor: number,
    actor: BillingActor,
    session: ClientSession | null,
    meta?: Record<string, unknown>,
  ): Promise<IAgencyInvoice> {
    assertNonNegativeMinor(amountMinor, 'allocation.amountMinor');
    if (amountMinor === 0) throw new BadRequestError('Allocation amount must be positive');

    for (let attempt = 0; attempt < 5; attempt++) {
      const query = AgencyInvoice.findById(invoiceId);
      if (session) query.session(session);
      const doc = await query.exec();
      if (!doc || doc.isDeleted) throw new NotFoundError('Invoice');
      if (doc.kind !== 'invoice') throw new BadRequestError('Cannot allocate to a credit note');
      if (!OPEN_FOR_PAYMENT.includes(doc.status) && doc.status !== 'paid') {
        // Allow allocation only while balance remains
        if (doc.balanceDueMinor <= 0) {
          throw new BadRequestError(`Invoice ${doc.code} is not open for payment`);
        }
      }
      if (amountMinor > doc.balanceDueMinor) {
        throw new BadRequestError(
          `Allocation ${amountMinor} exceeds balance due ${doc.balanceDueMinor} on ${doc.code}`,
        );
      }

      const nextPaid = doc.amountPaidMinor + amountMinor;
      const nextBalance = Math.max(0, doc.grandTotalMinor - nextPaid - doc.amountCreditedMinor);
      const nextStatus = deriveBalanceStatus(nextBalance, nextPaid, doc.dueDate, doc.status);
      const expectedVersion = doc.ledgerVersion;

      const update = AgencyInvoice.findOneAndUpdate(
        {
          _id: doc._id,
          ledgerVersion: expectedVersion,
          isDeleted: { $ne: true },
          balanceDueMinor: { $gte: amountMinor },
        },
        {
          $inc: { amountPaidMinor: amountMinor, ledgerVersion: 1 },
          $set: {
            balanceDueMinor: nextBalance,
            status: nextStatus,
            updatedBy: new Types.ObjectId(actor.id),
          },
          $push: {
            activityLog: this.buildActivity(
              'payment_allocated',
              `Payment of ${amountMinor} minor units allocated`,
              actor,
              meta,
            ),
          },
        },
        { new: true, ...(session ? { session } : {}) },
      );
      const updated = await update.exec();
      if (updated) return updated;
    }
    throw new ConflictError('Concurrent invoice update — retry allocation');
  }

  async reversePaymentAllocation(
    invoiceId: string,
    amountMinor: number,
    actor: BillingActor,
    session: ClientSession | null,
    meta?: Record<string, unknown>,
  ): Promise<IAgencyInvoice> {
    assertNonNegativeMinor(amountMinor, 'reversal.amountMinor');
    if (amountMinor === 0) throw new BadRequestError('Reversal amount must be positive');

    for (let attempt = 0; attempt < 5; attempt++) {
      const query = AgencyInvoice.findById(invoiceId);
      if (session) query.session(session);
      const doc = await query.exec();
      if (!doc || doc.isDeleted) throw new NotFoundError('Invoice');
      if (amountMinor > doc.amountPaidMinor) {
        throw new BadRequestError('Cannot reverse more than amount paid');
      }

      const nextPaid = doc.amountPaidMinor - amountMinor;
      const nextBalance = Math.max(0, doc.grandTotalMinor - nextPaid - doc.amountCreditedMinor);
      const nextStatus =
        doc.status === 'cancelled'
          ? 'cancelled'
          : deriveBalanceStatus(nextBalance, nextPaid, doc.dueDate, 'issued');
      const expectedVersion = doc.ledgerVersion;

      const updated = await AgencyInvoice.findOneAndUpdate(
        {
          _id: doc._id,
          ledgerVersion: expectedVersion,
          amountPaidMinor: { $gte: amountMinor },
        },
        {
          $inc: { amountPaidMinor: -amountMinor, ledgerVersion: 1 },
          $set: {
            balanceDueMinor: nextBalance,
            status: nextStatus,
            updatedBy: new Types.ObjectId(actor.id),
          },
          $push: {
            activityLog: this.buildActivity(
              'payment_reversed',
              `Payment allocation of ${amountMinor} reversed`,
              actor,
              meta,
            ),
          },
        },
        { new: true, ...(session ? { session } : {}) },
      ).exec();
      if (updated) return updated;
    }
    throw new ConflictError('Concurrent invoice update — retry reversal');
  }

  async applyCreditNote(
    invoiceId: string,
    creditAmountMinor: number,
    actor: BillingActor,
    session: ClientSession | null,
    meta?: Record<string, unknown>,
  ): Promise<IAgencyInvoice> {
    assertNonNegativeMinor(creditAmountMinor, 'creditAmountMinor');
    for (let attempt = 0; attempt < 5; attempt++) {
      const query = AgencyInvoice.findById(invoiceId);
      if (session) query.session(session);
      const doc = await query.exec();
      if (!doc || doc.isDeleted) throw new NotFoundError('Invoice');
      if (doc.kind !== 'invoice') throw new BadRequestError('Target must be an invoice');
      if (['draft', 'cancelled'].includes(doc.status)) {
        throw new BadRequestError('Cannot credit a draft or cancelled invoice');
      }
      const maxCredit = doc.grandTotalMinor - doc.amountCreditedMinor;
      if (creditAmountMinor > maxCredit) {
        throw new BadRequestError('Credit exceeds remaining invoice value');
      }

      const nextCredited = doc.amountCreditedMinor + creditAmountMinor;
      const nextBalance = Math.max(0, doc.grandTotalMinor - doc.amountPaidMinor - nextCredited);
      const nextStatus =
        nextCredited >= doc.grandTotalMinor
          ? 'credited'
          : deriveBalanceStatus(nextBalance, doc.amountPaidMinor, doc.dueDate, doc.status);

      const updated = await AgencyInvoice.findOneAndUpdate(
        {
          _id: doc._id,
          ledgerVersion: doc.ledgerVersion,
          amountCreditedMinor: doc.amountCreditedMinor,
        },
        {
          $inc: { amountCreditedMinor: creditAmountMinor, ledgerVersion: 1 },
          $set: {
            balanceDueMinor: nextBalance,
            status: nextStatus,
            updatedBy: new Types.ObjectId(actor.id),
          },
          $push: {
            activityLog: this.buildActivity(
              'credit_applied',
              `Credit note of ${creditAmountMinor} applied`,
              actor,
              meta,
            ),
          },
        },
        { new: true, ...(session ? { session } : {}) },
      ).exec();
      if (updated) return updated;
    }
    throw new ConflictError('Concurrent invoice update — retry credit');
  }

  private maybeMarkOverdue(doc: IAgencyInvoice): IAgencyInvoice {
    if (
      (doc.status === 'issued' || doc.status === 'partially_paid') &&
      doc.dueDate &&
      doc.dueDate.getTime() < Date.now() &&
      doc.balanceDueMinor > 0 &&
      doc.status === 'issued'
    ) {
      doc.status = 'overdue';
    }
    return doc;
  }

  private toResponse(doc: IAgencyInvoice, extras?: {
    clientName?: string;
    clientCode?: string;
    projectName?: string;
    projectCode?: string;
  }) {
    this.maybeMarkOverdue(doc);
    return {
      id: doc.id,
      code: doc.code,
      kind: doc.kind,
      originalInvoiceId: doc.originalInvoiceId ? String(doc.originalInvoiceId) : null,
      clientId: String(doc.clientId),
      clientName: extras?.clientName,
      clientCode: extras?.clientCode,
      projectId: doc.projectId ? String(doc.projectId) : null,
      projectName: extras?.projectName,
      projectCode: extras?.projectCode,
      quotationId: doc.quotationId ? String(doc.quotationId) : null,
      title: doc.title,
      status: doc.status,
      issueDate: doc.issueDate?.toISOString(),
      dueDate: doc.dueDate?.toISOString(),
      paymentTermsDays: doc.paymentTermsDays,
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
      amountPaidMinor: doc.amountPaidMinor,
      amountCreditedMinor: doc.amountCreditedMinor,
      balanceDueMinor: doc.balanceDueMinor,
      billingSnapshot: doc.billingSnapshot,
      paymentTerms: doc.paymentTerms,
      notes: doc.notes,
      internalNotes: doc.internalNotes,
      cancelledAt: doc.cancelledAt?.toISOString(),
      cancelReason: doc.cancelReason,
      ledgerVersion: doc.ledgerVersion,
      activityLog: [...(doc.activityLog ?? [])]
        .slice()
        .reverse()
        .map((entry) => ({
          id: (entry as IInvoiceActivity & { id?: string; _id?: Types.ObjectId }).id
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

  private async resolveExtras(doc: IAgencyInvoice) {
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
    taxConfig?: CreateInvoiceDto['taxConfig'];
    indianTax?: IndianTaxSettings;
    lineItems: LineItemInput[];
    documentDiscountPercent?: number;
    documentDiscountMinor?: number;
  }) {
    const taxConfig = this.resolveTaxConfig(input);
    return calculateInvoiceTotals({
      currency: input.currency,
      taxConfig: { mode: taxConfig.mode, rates: taxConfig.rates },
      lineItems: input.lineItems,
      documentDiscountPercent: input.documentDiscountPercent,
      documentDiscountMinor: input.documentDiscountMinor,
    });
  }

  async list(query: ListInvoicesQuery, _actor: BillingActor) {
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
    if (query.kind) filter.kind = query.kind;

    const findQuery = AgencyInvoice.find(filter).sort(sort).skip(skip).limit(limit);
    const countQuery = AgencyInvoice.countDocuments(filter);
    if (query.trashOnly || query.includeTrash) {
      findQuery.setOptions({ includeDeleted: true });
      countQuery.setOptions({ includeDeleted: true });
    }

    const [items, total] = await Promise.all([findQuery.exec(), countQuery.exec()]);

    // Soft-expire overdue
    await Promise.all(
      items
        .filter(
          (item) =>
            item.status === 'issued' &&
            item.dueDate &&
            item.dueDate.getTime() < Date.now() &&
            item.balanceDueMinor > 0,
        )
        .map((item) =>
          AgencyInvoice.updateOne(
            { _id: item._id, status: 'issued' },
            { status: 'overdue' },
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
        if (
          item.status === 'issued' &&
          item.dueDate &&
          item.dueDate.getTime() < Date.now() &&
          item.balanceDueMinor > 0
        ) {
          item.status = 'overdue';
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

  async getById(id: string, _actor: BillingActor) {
    const doc = await this.getOrThrow(id);
    if (
      doc.status === 'issued' &&
      doc.dueDate &&
      doc.dueDate.getTime() < Date.now() &&
      doc.balanceDueMinor > 0
    ) {
      doc.status = 'overdue';
      await doc.save();
    }
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async create(dto: CreateInvoiceDto, actor: BillingActor) {
    const client = await this.assertClient(dto.clientId);
    await this.assertProject(dto.projectId, dto.clientId);

    if (dto.quotationId) {
      const quotation = await AgencyQuotation.findById(dto.quotationId).exec();
      if (!quotation || quotation.isDeleted) throw new BadRequestError('Quotation not found');
      if (String(quotation.clientId) !== dto.clientId) {
        throw new BadRequestError('Quotation does not belong to the selected client');
      }
    }

    const code = await allocateAgencyDocumentCode('invoice');
    const paymentTermsDays = dto.paymentTermsDays ?? client.paymentTermsDays ?? 15;
    const taxConfig = this.resolveTaxConfig(dto);

    const doc = new AgencyInvoice({
      code,
      kind: 'invoice',
      clientId: dto.clientId,
      projectId: dto.projectId || null,
      quotationId: dto.quotationId || null,
      title: dto.title.trim(),
      status: 'draft',
      issueDate: dto.issueDate || undefined,
      dueDate: this.computeDueDate(
        dto.issueDate || undefined,
        dto.dueDate,
        paymentTermsDays,
      ),
      paymentTermsDays,
      currency: dto.currency ?? client.defaultCurrency ?? DEFAULT_AGENCY_CURRENCY,
      documentDiscountPercent: dto.documentDiscountPercent ?? 0,
      documentDiscountMinor: dto.documentDiscountMinor ?? 0,
      paymentTerms: dto.paymentTerms,
      notes: dto.notes,
      internalNotes: dto.internalNotes,
      amountPaidMinor: 0,
      amountCreditedMinor: 0,
      ledgerVersion: 1,
      isActive: true,
      activityLog: [this.buildActivity('created', 'Invoice draft created', actor, { code })],
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });

    this.applyTotals(doc, {
      currency: dto.currency,
      taxConfig,
      lineItems: dto.lineItems,
      documentDiscountPercent: dto.documentDiscountPercent,
      documentDiscountMinor: dto.documentDiscountMinor,
    });

    await doc.save();
    loggers.admin.info('Invoice created', { id: doc.id, code, actorId: actor.id });
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async update(id: string, dto: UpdateInvoiceDto, actor: BillingActor) {
    const doc = await this.getOrThrow(id);
    if (!DRAFT_EDITABLE.includes(doc.status)) {
      throw new BadRequestError(
        'Issued invoices cannot be silently edited. Cancel or issue a credit note instead.',
      );
    }
    if (doc.isDeleted) throw new BadRequestError('Cannot edit a trashed invoice');
    if (doc.kind !== 'invoice') throw new BadRequestError('Credit notes are immutable after create');

    if (dto.clientId) await this.assertClient(dto.clientId);
    await this.assertProject(
      dto.projectId !== undefined ? dto.projectId : doc.projectId ? String(doc.projectId) : null,
      dto.clientId ?? String(doc.clientId),
    );

    if (dto.clientId) doc.clientId = new Types.ObjectId(dto.clientId);
    if (dto.projectId !== undefined) {
      doc.projectId = dto.projectId ? new Types.ObjectId(dto.projectId) : null;
    }
    if (dto.quotationId !== undefined) {
      doc.quotationId = dto.quotationId ? new Types.ObjectId(dto.quotationId) : null;
    }
    if (dto.title !== undefined) doc.title = dto.title.trim();
    if (dto.paymentTermsDays !== undefined) doc.paymentTermsDays = dto.paymentTermsDays;
    if (dto.issueDate !== undefined) doc.issueDate = dto.issueDate || undefined;
    if (dto.dueDate !== undefined || dto.issueDate !== undefined || dto.paymentTermsDays !== undefined) {
      doc.dueDate = this.computeDueDate(
        doc.issueDate,
        dto.dueDate !== undefined ? dto.dueDate : doc.dueDate,
        doc.paymentTermsDays,
      );
    }
    if (dto.paymentTerms !== undefined) doc.paymentTerms = dto.paymentTerms;
    if (dto.notes !== undefined) doc.notes = dto.notes;
    if (dto.internalNotes !== undefined) doc.internalNotes = dto.internalNotes;

    if (
      dto.lineItems ||
      dto.taxConfig ||
      dto.indianTax ||
      dto.currency ||
      dto.documentDiscountPercent !== undefined ||
      dto.documentDiscountMinor !== undefined
    ) {
      const taxConfig = this.resolveTaxConfig({
        taxConfig: dto.taxConfig ?? doc.taxConfig,
        indianTax: dto.indianTax,
      });
      this.applyTotals(doc, {
        currency: dto.currency,
        taxConfig,
        lineItems: dto.lineItems ?? (doc.lineItems as unknown as LineItemInput[]),
        documentDiscountPercent: dto.documentDiscountPercent,
        documentDiscountMinor: dto.documentDiscountMinor,
      });
    }

    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(this.buildActivity('updated', 'Invoice draft updated', actor));
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async issue(id: string, actor: BillingActor) {
    const doc = await this.getOrThrow(id);
    if (!ISSUABLE.includes(doc.status)) {
      throw new BadRequestError('Only draft invoices can be issued');
    }
    if (!doc.lineItems?.length) throw new BadRequestError('Cannot issue an empty invoice');
    if (doc.kind !== 'invoice') throw new BadRequestError('Only invoices can be issued this way');

    const client = await this.assertClient(String(doc.clientId));
    const issueDate = doc.issueDate ?? new Date();
    doc.issueDate = issueDate;
    doc.dueDate =
      doc.dueDate ??
      this.computeDueDate(issueDate, null, doc.paymentTermsDays);
    doc.billingSnapshot = {
      clientName: client.name,
      clientCode: client.code,
      legalName: client.legalName,
      email: client.email,
      phone: client.phone,
      taxId: client.taxId,
      billingAddress: client.billingAddress
        ? {
            line1: client.billingAddress.line1,
            line2: client.billingAddress.line2,
            city: client.billingAddress.city,
            state: client.billingAddress.state,
            postalCode: client.billingAddress.postalCode,
            country: client.billingAddress.country,
          }
        : undefined,
      paymentTermsDays: doc.paymentTermsDays,
    };
    doc.balanceDueMinor = doc.grandTotalMinor;
    doc.amountPaidMinor = 0;
    doc.amountCreditedMinor = 0;
    doc.status = deriveBalanceStatus(
      doc.balanceDueMinor,
      0,
      doc.dueDate,
      'issued',
    );
    doc.isActive = true;
    doc.ledgerVersion += 1;
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(
      this.buildActivity('issued', 'Invoice issued — financial history locked', actor, {
        code: doc.code,
        grandTotalMinor: doc.grandTotalMinor,
      }),
    );
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async cancel(id: string, reason: string, actor: BillingActor) {
    const doc = await this.getOrThrow(id);
    if (doc.kind !== 'invoice') throw new BadRequestError('Cancel applies to invoices only');
    if (doc.status === 'cancelled') throw new BadRequestError('Invoice already cancelled');
    if (doc.status === 'draft') {
      throw new BadRequestError('Delete the draft instead of cancelling');
    }
    if (doc.amountPaidMinor > 0) {
      throw new BadRequestError(
        'Cannot cancel an invoice with confirmed payments. Issue a credit note or reverse allocations first.',
      );
    }

    doc.status = 'cancelled';
    doc.cancelledAt = new Date();
    doc.cancelReason = reason.trim();
    doc.balanceDueMinor = 0;
    doc.isActive = false;
    doc.ledgerVersion += 1;
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(
      this.buildActivity('cancelled', `Invoice cancelled: ${reason.trim()}`, actor),
    );
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async createCreditNote(
    invoiceId: string,
    dto: {
      title?: string;
      lineItems?: LineItemInput[];
      reason?: string;
      indianTax?: IndianTaxSettings;
      taxConfig?: CreateInvoiceDto['taxConfig'];
    },
    actor: BillingActor,
  ) {
    const original = await this.getOrThrow(invoiceId);
    if (original.kind !== 'invoice') throw new BadRequestError('Credit notes apply to invoices only');
    if (['draft', 'cancelled'].includes(original.status)) {
      throw new BadRequestError('Cannot credit a draft or cancelled invoice');
    }

    const remaining = original.grandTotalMinor - original.amountCreditedMinor;
    if (remaining <= 0) throw new BadRequestError('Invoice is already fully credited');

    const lineItems: LineItemInput[] =
      dto.lineItems ??
      original.lineItems.map((line) => ({
        description: `Credit: ${line.description}`,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
        discountPercent: line.discountPercent,
        discountMinor: line.discountMinor,
        unit: line.unit,
      }));

    const taxConfig = this.resolveTaxConfig({
      taxConfig: dto.taxConfig ?? original.taxConfig,
      indianTax: dto.indianTax,
    });
    const totals = calculateInvoiceTotals({
      currency: original.currency as CurrencyCode,
      taxConfig: { mode: taxConfig.mode, rates: taxConfig.rates },
      lineItems,
    });

    if (totals.grandTotalMinor > remaining) {
      throw new BadRequestError('Credit note total exceeds remaining invoice value');
    }

    const code = await allocateAgencyDocumentCode('invoice');
    const credit = new AgencyInvoice({
      code,
      kind: 'credit_note',
      originalInvoiceId: original._id,
      clientId: original.clientId,
      projectId: original.projectId,
      quotationId: original.quotationId,
      title: dto.title?.trim() || `Credit note for ${original.code}`,
      status: 'issued',
      issueDate: new Date(),
      paymentTermsDays: 0,
      currency: original.currency,
      taxConfig: {
        mode: taxConfig.mode,
        rates: taxConfig.rates,
        treatment: taxConfig.treatment,
        gstPercent: taxConfig.gstPercent,
        placeOfSupplyState: taxConfig.placeOfSupplyState,
        supplierState: taxConfig.supplierState,
      },
      lineItems: totals.lines,
      subtotalMinor: totals.subtotalMinor,
      discountTotalMinor: totals.discountTotalMinor,
      taxMinor: totals.taxMinor,
      grandTotalMinor: totals.grandTotalMinor,
      taxBreakdown: totals.taxBreakdown,
      amountPaidMinor: 0,
      amountCreditedMinor: 0,
      balanceDueMinor: 0,
      billingSnapshot: original.billingSnapshot,
      notes: dto.reason,
      internalNotes: `Credit against ${original.code}`,
      ledgerVersion: 1,
      isActive: true,
      activityLog: [
        this.buildActivity('credit_note_created', `Credit note for ${original.code}`, actor, {
          originalInvoiceId: original.id,
          amountMinor: totals.grandTotalMinor,
        }),
      ],
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });
    await credit.save();

    await this.applyCreditNote(original.id, totals.grandTotalMinor, actor, null, {
      creditNoteId: credit.id,
      creditNoteCode: credit.code,
    });

    const extras = await this.resolveExtras(credit);
    return this.toResponse(credit, extras);
  }

  async addNote(id: string, note: string, actor: BillingActor) {
    const doc = await this.getOrThrow(id);
    doc.activityLog.push(this.buildActivity('note', note.trim(), actor));
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async softDelete(id: string, actor: BillingActor) {
    const doc = await this.getOrThrow(id, true);
    if (doc.status !== 'draft') {
      throw new BadRequestError(
        'Issued invoices cannot be deleted. Cancel or credit them instead.',
      );
    }
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.isActive = false;
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(this.buildActivity('trashed', 'Draft invoice moved to trash', actor));
    await doc.save();
  }

  async restore(id: string, actor: BillingActor) {
    const doc = await this.getOrThrow(id, true);
    if (!doc.isDeleted) throw new BadRequestError('Invoice is not in trash');
    doc.isDeleted = false;
    doc.deletedAt = undefined;
    doc.isActive = doc.status === 'draft';
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(this.buildActivity('restored', 'Invoice restored from trash', actor));
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async generatePdf(id: string, _actor: BillingActor) {
    const doc = await this.getOrThrow(id);
    const buffer = await buildInvoicePdfBuffer(doc);
    return {
      buffer,
      filename: `${doc.code}.pdf`,
      contentType: 'application/pdf',
    };
  }
}

export const invoiceService = new InvoiceService();
