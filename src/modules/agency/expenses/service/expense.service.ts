import { Types } from 'mongoose';
import { BadRequestError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import { UserRole } from '@core/constants';
import { DEFAULT_AGENCY_CURRENCY, type CurrencyCode } from '@core/utils/money';
import { AgencyClient } from '@modules/agency/clients/model/client.model';
import { allocateAgencyDocumentCode } from '@modules/agency/clients/service/number-sequence.service';
import { AgencyProject } from '@modules/agency/projects/model/project.model';
import {
  AgencyExpense,
  ExpenseCategory,
  ExpensePaymentStatus,
  ExpenseStatus,
  IAgencyExpense,
  IExpenseActivity,
  RecurringInterval,
} from '../model/expense.model';

type Filter = Record<string, unknown>;

export type ExpenseActor = {
  id: string;
  role: UserRole | string;
  fullName?: string;
};

export type CreateExpenseDto = {
  expenseDate: Date;
  category: ExpenseCategory;
  vendor: string;
  description: string;
  amountMinor: number;
  currency?: CurrencyCode;
  paymentStatus?: ExpensePaymentStatus;
  reference?: string;
  supportingDocument?: { fileName: string; url: string; mimeType?: string } | null;
  clientId?: string | null;
  projectId?: string | null;
  isRecurring?: boolean;
  recurringInterval?: RecurringInterval | null;
  idempotencyKey?: string;
};

export type UpdateExpenseDto = Partial<CreateExpenseDto>;

export type ListExpensesQuery = PaginationQuery & {
  search?: string;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  paymentStatus?: ExpensePaymentStatus;
  clientId?: string;
  projectId?: string;
  isRecurring?: boolean;
  from?: Date;
  to?: Date;
  trashOnly?: boolean;
};

const EDITABLE: ExpenseStatus[] = ['draft', 'recorded'];

export class ExpenseService {
  private buildActivity(
    type: string,
    message: string,
    actor: ExpenseActor,
    meta?: Record<string, unknown>,
  ): IExpenseActivity {
    return {
      type,
      message,
      meta,
      createdBy: new Types.ObjectId(actor.id),
      createdByName: actor.fullName,
      createdAt: new Date(),
    };
  }

  private async getOrThrow(id: string, includeDeleted = false): Promise<IAgencyExpense> {
    const query = AgencyExpense.findById(id);
    if (includeDeleted) query.setOptions({ includeDeleted: true });
    const doc = await query.exec();
    if (!doc) throw new NotFoundError('Expense');
    return doc;
  }

  private async assertClient(clientId?: string | null) {
    if (!clientId) return null;
    const client = await AgencyClient.findById(clientId).exec();
    if (!client || client.isDeleted) throw new BadRequestError('Client not found');
    return client;
  }

  private async assertProject(projectId?: string | null, clientId?: string | null) {
    if (!projectId) return null;
    const project = await AgencyProject.findById(projectId).exec();
    if (!project || project.isDeleted) throw new BadRequestError('Project not found');
    if (clientId && String(project.clientId) !== clientId) {
      throw new BadRequestError('Project does not belong to the selected client');
    }
    return project;
  }

  private toResponse(
    doc: IAgencyExpense,
    extras?: { clientName?: string; clientCode?: string; projectName?: string; projectCode?: string },
  ) {
    return {
      id: doc.id,
      code: doc.code,
      status: doc.status,
      expenseDate: doc.expenseDate.toISOString(),
      category: doc.category,
      vendor: doc.vendor,
      description: doc.description,
      amountMinor: doc.amountMinor,
      currency: doc.currency,
      paymentStatus: doc.paymentStatus,
      reference: doc.reference,
      supportingDocument: doc.supportingDocument,
      clientId: doc.clientId ? String(doc.clientId) : null,
      clientName: extras?.clientName,
      clientCode: extras?.clientCode,
      projectId: doc.projectId ? String(doc.projectId) : null,
      projectName: extras?.projectName,
      projectCode: extras?.projectCode,
      isRecurring: doc.isRecurring,
      recurringInterval: doc.recurringInterval,
      idempotencyKey: doc.idempotencyKey,
      voidedAt: doc.voidedAt?.toISOString(),
      voidReason: doc.voidReason,
      finalizedAt: doc.finalizedAt?.toISOString(),
      activityLog: [...(doc.activityLog ?? [])]
        .slice()
        .reverse()
        .map((entry) => ({
          id:
            (entry as IExpenseActivity & { id?: string; _id?: Types.ObjectId }).id ??
            ((entry as { _id?: Types.ObjectId })._id
              ? String((entry as { _id?: Types.ObjectId })._id)
              : undefined),
          type: entry.type,
          message: entry.message,
          createdByName: entry.createdByName,
          createdAt: entry.createdAt?.toISOString?.() ?? new Date(entry.createdAt).toISOString(),
        })),
      isActive: doc.isActive,
      isDeleted: doc.isDeleted,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  private async resolveExtras(doc: IAgencyExpense) {
    const [client, project] = await Promise.all([
      doc.clientId ? AgencyClient.findById(doc.clientId).select('name code').exec() : null,
      doc.projectId ? AgencyProject.findById(doc.projectId).select('name code').exec() : null,
    ]);
    return {
      clientName: client?.name,
      clientCode: client?.code,
      projectName: project?.name,
      projectCode: project?.code,
    };
  }

  async list(query: ListExpensesQuery, _actor: ExpenseActor) {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'expenseDate',
      order: query.order ?? 'desc',
    });

    const filter: Filter = {
      ...buildSearchFilter(query.search, ['code', 'vendor', 'description', 'reference']),
    };
    if (query.trashOnly) filter.isDeleted = true;
    else filter.isDeleted = { $ne: true };
    if (query.status) filter.status = query.status;
    if (query.category) filter.category = query.category;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
    if (query.clientId) filter.clientId = query.clientId;
    if (query.projectId) filter.projectId = query.projectId;
    if (query.isRecurring !== undefined) filter.isRecurring = query.isRecurring;
    if (query.from || query.to) {
      filter.expenseDate = {};
      if (query.from) (filter.expenseDate as Filter).$gte = query.from;
      if (query.to) (filter.expenseDate as Filter).$lte = query.to;
    }

    const findQuery = AgencyExpense.find(filter).sort(sort).skip(skip).limit(limit);
    const countQuery = AgencyExpense.countDocuments(filter);
    if (query.trashOnly) {
      findQuery.setOptions({ includeDeleted: true });
      countQuery.setOptions({ includeDeleted: true });
    }

    const [items, total] = await Promise.all([findQuery.exec(), countQuery.exec()]);
    const clientIds = [...new Set(items.filter((i) => i.clientId).map((i) => String(i.clientId)))];
    const projectIds = [...new Set(items.filter((i) => i.projectId).map((i) => String(i.projectId)))];
    const [clients, projects] = await Promise.all([
      clientIds.length
        ? AgencyClient.find({ _id: { $in: clientIds } }).select('name code').exec()
        : [],
      projectIds.length
        ? AgencyProject.find({ _id: { $in: projectIds } }).select('name code').exec()
        : [],
    ]);
    const clientMap = new Map(clients.map((c) => [c.id, c]));
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    return {
      items: items.map((item) => {
        const client = item.clientId ? clientMap.get(String(item.clientId)) : undefined;
        const project = item.projectId ? projectMap.get(String(item.projectId)) : undefined;
        return this.toResponse(item, {
          clientName: client?.name,
          clientCode: client?.code,
          projectName: project?.name,
          projectCode: project?.code,
        });
      }),
      meta: buildPaginationMeta(total, page, limit) as PaginationMeta,
    };
  }

  async getById(id: string, _actor: ExpenseActor) {
    const doc = await this.getOrThrow(id);
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async create(dto: CreateExpenseDto, actor: ExpenseActor) {
    if (dto.idempotencyKey) {
      const existing = await AgencyExpense.findOne({ idempotencyKey: dto.idempotencyKey })
        .setOptions({ includeDeleted: true })
        .exec();
      if (existing) {
        const extras = await this.resolveExtras(existing);
        return this.toResponse(existing, extras);
      }
    }

    await this.assertClient(dto.clientId);
    await this.assertProject(dto.projectId, dto.clientId);

    if (dto.isRecurring && !dto.recurringInterval) {
      throw new BadRequestError('Recurring expenses require a recurringInterval');
    }

    const code = await allocateAgencyDocumentCode('expense');
    const doc = new AgencyExpense({
      code,
      status: 'draft',
      expenseDate: dto.expenseDate,
      category: dto.category,
      vendor: dto.vendor.trim(),
      description: dto.description.trim(),
      amountMinor: dto.amountMinor,
      currency: dto.currency ?? DEFAULT_AGENCY_CURRENCY,
      paymentStatus: dto.paymentStatus ?? 'unpaid',
      reference: dto.reference?.trim(),
      supportingDocument: dto.supportingDocument || undefined,
      clientId: dto.clientId || null,
      projectId: dto.projectId || null,
      isRecurring: dto.isRecurring ?? false,
      recurringInterval: dto.recurringInterval || undefined,
      idempotencyKey: dto.idempotencyKey,
      isActive: true,
      activityLog: [this.buildActivity('created', 'Expense draft created', actor, { code })],
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });

    try {
      await doc.save();
    } catch (error) {
      if ((error as { code?: number }).code === 11000 && dto.idempotencyKey) {
        const existing = await AgencyExpense.findOne({ idempotencyKey: dto.idempotencyKey }).exec();
        if (existing) {
          const extras = await this.resolveExtras(existing);
          return this.toResponse(existing, extras);
        }
      }
      throw error;
    }

    loggers.admin.info('Expense created', { id: doc.id, code, actorId: actor.id });
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async update(id: string, dto: UpdateExpenseDto, actor: ExpenseActor) {
    const doc = await this.getOrThrow(id);
    if (!EDITABLE.includes(doc.status)) {
      throw new BadRequestError(
        'Finalized or void expenses cannot be edited. Void and recreate if correction is needed.',
      );
    }
    if (doc.isDeleted) throw new BadRequestError('Cannot edit a trashed expense');

    await this.assertClient(dto.clientId !== undefined ? dto.clientId : doc.clientId ? String(doc.clientId) : null);
    await this.assertProject(
      dto.projectId !== undefined ? dto.projectId : doc.projectId ? String(doc.projectId) : null,
      dto.clientId !== undefined
        ? dto.clientId
        : doc.clientId
          ? String(doc.clientId)
          : null,
    );

    if (dto.expenseDate !== undefined) doc.expenseDate = dto.expenseDate;
    if (dto.category !== undefined) doc.category = dto.category;
    if (dto.vendor !== undefined) doc.vendor = dto.vendor.trim();
    if (dto.description !== undefined) doc.description = dto.description.trim();
    if (dto.amountMinor !== undefined) doc.amountMinor = dto.amountMinor;
    if (dto.currency !== undefined) doc.currency = dto.currency;
    if (dto.paymentStatus !== undefined) doc.paymentStatus = dto.paymentStatus;
    if (dto.reference !== undefined) doc.reference = dto.reference?.trim();
    if (dto.supportingDocument !== undefined) {
      doc.supportingDocument = dto.supportingDocument || undefined;
    }
    if (dto.clientId !== undefined) {
      doc.clientId = dto.clientId ? new Types.ObjectId(dto.clientId) : null;
    }
    if (dto.projectId !== undefined) {
      doc.projectId = dto.projectId ? new Types.ObjectId(dto.projectId) : null;
    }
    if (dto.isRecurring !== undefined) doc.isRecurring = dto.isRecurring;
    if (dto.recurringInterval !== undefined) {
      doc.recurringInterval = dto.recurringInterval || undefined;
    }
    if (doc.isRecurring && !doc.recurringInterval) {
      throw new BadRequestError('Recurring expenses require a recurringInterval');
    }

    // Persist as recorded once edited fields are complete
    if (doc.status === 'draft') doc.status = 'recorded';

    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(this.buildActivity('updated', 'Expense updated', actor));
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async record(id: string, actor: ExpenseActor) {
    const doc = await this.getOrThrow(id);
    if (doc.status !== 'draft') throw new BadRequestError('Only drafts can be marked recorded');
    doc.status = 'recorded';
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(this.buildActivity('recorded', 'Expense marked recorded', actor));
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async finalize(id: string, actor: ExpenseActor) {
    const doc = await this.getOrThrow(id);
    if (!['draft', 'recorded'].includes(doc.status)) {
      throw new BadRequestError('Only draft or recorded expenses can be finalized');
    }
    doc.status = 'finalized';
    doc.finalizedAt = new Date();
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(
      this.buildActivity('finalized', 'Expense finalized — further edits blocked', actor),
    );
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async void(id: string, reason: string, actor: ExpenseActor) {
    const doc = await this.getOrThrow(id);
    if (doc.status === 'void') throw new BadRequestError('Expense already void');
    if (doc.status === 'draft') {
      throw new BadRequestError('Delete the draft instead of voiding');
    }
    doc.status = 'void';
    doc.voidedAt = new Date();
    doc.voidReason = reason.trim();
    doc.isActive = false;
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(
      this.buildActivity('voided', `Expense voided: ${reason.trim()}`, actor),
    );
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async addNote(id: string, note: string, actor: ExpenseActor) {
    const doc = await this.getOrThrow(id);
    doc.activityLog.push(this.buildActivity('note', note.trim(), actor));
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async softDelete(id: string, actor: ExpenseActor) {
    const doc = await this.getOrThrow(id, true);
    if (doc.status !== 'draft') {
      throw new BadRequestError('Only draft expenses can be trashed. Void finalized records instead.');
    }
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.isActive = false;
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(this.buildActivity('trashed', 'Expense moved to trash', actor));
    await doc.save();
  }

  async restore(id: string, actor: ExpenseActor) {
    const doc = await this.getOrThrow(id, true);
    if (!doc.isDeleted) throw new BadRequestError('Expense is not in trash');
    doc.isDeleted = false;
    doc.deletedAt = undefined;
    doc.isActive = true;
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(this.buildActivity('restored', 'Expense restored', actor));
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }
}

export const expenseService = new ExpenseService();
