import { randomUUID } from 'crypto';
import { Types, type ClientSession } from 'mongoose';
import { BadRequestError, ConflictError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import { DEFAULT_AGENCY_CURRENCY, type CurrencyCode } from '@core/utils/money';
import { AgencyClient } from '@modules/agency/clients/model/client.model';
import { allocateAgencyDocumentCode } from '@modules/agency/clients/service/number-sequence.service';
import {
  AgencyPayment,
  IAgencyPayment,
  IPaymentActivity,
  IPaymentAllocation,
  PaymentMethod,
  PaymentStatus,
} from '../model/payment.model';
import { AgencyReceipt } from '../model/receipt.model';
import { assertPositiveMinor } from './billing-calc';
import { invoiceService, type BillingActor } from './invoice.service';
import { withOptionalTransaction } from './mongo-tx';
import { buildReceiptPdfBuffer } from './receipt-pdf.service';
import { activityService } from '@modules/agency/activity/service/activity.service';

type Filter = Record<string, unknown>;

export type CreatePaymentDto = {
  clientId: string;
  amountMinor: number;
  currency?: CurrencyCode;
  method: PaymentMethod;
  paymentDate?: Date;
  transactionRef?: string;
  notes?: string;
  internalNotes?: string;
  idempotencyKey?: string;
  confirm?: boolean;
  allocations?: Array<{ invoiceId: string; amountMinor: number }>;
  attachments?: Array<{ fileName: string; url: string; mimeType?: string }>;
};

export type ListPaymentsQuery = PaginationQuery & {
  search?: string;
  status?: PaymentStatus;
  clientId?: string;
  invoiceId?: string;
  method?: PaymentMethod;
  trashOnly?: boolean;
};

/** Only confirmed payments count as money received. */
export function isReceivedStatus(status: PaymentStatus): boolean {
  return status === 'confirmed';
}

function activeAllocatedMinor(payment: IAgencyPayment): number {
  return (payment.allocations ?? [])
    .filter((a) => !a.reversedAt)
    .reduce((sum, a) => sum + a.amountMinor, 0);
}

function recomputeUnallocated(payment: IAgencyPayment): number {
  if (!isReceivedStatus(payment.status) && payment.status !== 'refunded') {
    // Pending/failed/reversed do not hold allocatable balance as "received"
    if (payment.status === 'pending') {
      return Math.max(0, payment.amountMinor - activeAllocatedMinor(payment));
    }
    return 0;
  }
  return Math.max(0, payment.amountMinor - activeAllocatedMinor(payment));
}

export class PaymentService {
  private buildActivity(
    type: string,
    message: string,
    actor: BillingActor,
    meta?: Record<string, unknown>,
  ): IPaymentActivity {
    return {
      type,
      message,
      meta,
      createdBy: new Types.ObjectId(actor.id),
      createdByName: actor.fullName,
      createdAt: new Date(),
    };
  }

  private async getOrThrow(id: string, includeDeleted = false): Promise<IAgencyPayment> {
    const query = AgencyPayment.findById(id);
    if (includeDeleted) query.setOptions({ includeDeleted: true });
    const doc = await query.exec();
    if (!doc) throw new NotFoundError('Payment');
    return doc;
  }

  private async assertClient(clientId: string) {
    const client = await AgencyClient.findById(clientId).exec();
    if (!client || client.isDeleted) throw new BadRequestError('Client not found');
    return client;
  }

  private toResponse(doc: IAgencyPayment, extras?: { clientName?: string; clientCode?: string }) {
    return {
      id: doc.id,
      code: doc.code,
      clientId: String(doc.clientId),
      clientName: extras?.clientName,
      clientCode: extras?.clientCode,
      amountMinor: doc.amountMinor,
      currency: doc.currency,
      method: doc.method,
      status: doc.status,
      paymentDate: doc.paymentDate.toISOString(),
      transactionRef: doc.transactionRef,
      notes: doc.notes,
      internalNotes: doc.internalNotes,
      idempotencyKey: doc.idempotencyKey,
      allocations: (doc.allocations ?? []).map((a) => ({
        key: a.key,
        invoiceId: String(a.invoiceId),
        invoiceCode: a.invoiceCode,
        amountMinor: a.amountMinor,
        allocatedAt: a.allocatedAt.toISOString(),
        reversedAt: a.reversedAt?.toISOString(),
        reversalReason: a.reversalReason,
      })),
      unallocatedMinor: doc.unallocatedMinor,
      refundOfPaymentId: doc.refundOfPaymentId ? String(doc.refundOfPaymentId) : null,
      attachments: doc.attachments,
      confirmedAt: doc.confirmedAt?.toISOString(),
      failedAt: doc.failedAt?.toISOString(),
      reversedAt: doc.reversedAt?.toISOString(),
      receiptId: doc.receiptId ? String(doc.receiptId) : null,
      countsAsReceived: isReceivedStatus(doc.status),
      activityLog: [...(doc.activityLog ?? [])]
        .slice()
        .reverse()
        .map((entry) => ({
          id: (entry as IPaymentActivity & { id?: string; _id?: Types.ObjectId }).id
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

  private async resolveExtras(doc: IAgencyPayment) {
    const client = await AgencyClient.findById(doc.clientId).select('name code').exec();
    return { clientName: client?.name, clientCode: client?.code };
  }

  async list(query: ListPaymentsQuery, _actor: BillingActor) {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'paymentDate',
      order: query.order ?? 'desc',
    });

    const filter: Filter = {
      ...buildSearchFilter(query.search, ['code', 'transactionRef', 'notes']),
    };
    if (query.trashOnly) filter.isDeleted = true;
    else filter.isDeleted = { $ne: true };
    if (query.status) filter.status = query.status;
    if (query.clientId) filter.clientId = query.clientId;
    if (query.method) filter.method = query.method;
    if (query.invoiceId) filter['allocations.invoiceId'] = query.invoiceId;

    const findQuery = AgencyPayment.find(filter).sort(sort).skip(skip).limit(limit);
    const countQuery = AgencyPayment.countDocuments(filter);
    if (query.trashOnly) {
      findQuery.setOptions({ includeDeleted: true });
      countQuery.setOptions({ includeDeleted: true });
    }

    const [items, total] = await Promise.all([findQuery.exec(), countQuery.exec()]);
    const clientIds = [...new Set(items.map((i) => String(i.clientId)))];
    const clients = clientIds.length
      ? await AgencyClient.find({ _id: { $in: clientIds } }).select('name code').exec()
      : [];
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    return {
      items: items.map((item) => {
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
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  async create(dto: CreatePaymentDto, actor: BillingActor) {
    assertPositiveMinor(dto.amountMinor, 'amountMinor');
    await this.assertClient(dto.clientId);

    if (dto.idempotencyKey) {
      const existing = await AgencyPayment.findOne({ idempotencyKey: dto.idempotencyKey })
        .setOptions({ includeDeleted: true })
        .exec();
      if (existing) {
        const extras = await this.resolveExtras(existing);
        return this.toResponse(existing, extras);
      }
    }

    const allocationSum = (dto.allocations ?? []).reduce((s, a) => s + a.amountMinor, 0);
    if (allocationSum > dto.amountMinor) {
      throw new BadRequestError('Allocations exceed payment amount');
    }

    const code = await allocateAgencyDocumentCode('payment');
    const confirm = dto.confirm === true;
    const status: PaymentStatus = confirm ? 'confirmed' : 'pending';

    const doc = new AgencyPayment({
      code,
      clientId: dto.clientId,
      amountMinor: dto.amountMinor,
      currency: dto.currency ?? DEFAULT_AGENCY_CURRENCY,
      method: dto.method,
      status,
      paymentDate: dto.paymentDate ?? new Date(),
      transactionRef: dto.transactionRef?.trim(),
      notes: dto.notes,
      internalNotes: dto.internalNotes,
      idempotencyKey: dto.idempotencyKey,
      allocations: [],
      unallocatedMinor: dto.amountMinor,
      attachments: dto.attachments ?? [],
      confirmedAt: confirm ? new Date() : undefined,
      isActive: true,
      activityLog: [
        this.buildActivity(
          'created',
          confirm ? 'Verified payment recorded and confirmed' : 'Payment recorded as pending',
          actor,
          { code, status },
        ),
      ],
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });

    try {
      await doc.save();
    } catch (error) {
      if ((error as { code?: number }).code === 11000 && dto.idempotencyKey) {
        const existing = await AgencyPayment.findOne({ idempotencyKey: dto.idempotencyKey }).exec();
        if (existing) {
          const extras = await this.resolveExtras(existing);
          return this.toResponse(existing, extras);
        }
      }
      throw error;
    }

    if (dto.allocations?.length) {
      await this.allocateInternal(doc.id, dto.allocations, actor);
    } else if (confirm) {
      await this.ensureReceipt(doc.id, actor);
    }

    const fresh = await this.getOrThrow(doc.id);
    loggers.admin.info('Payment created', {
      id: fresh.id,
      code: fresh.code,
      status: fresh.status,
      actorId: actor.id,
    });
    const extras = await this.resolveExtras(fresh);
    return this.toResponse(fresh, extras);
  }

  async confirm(id: string, actor: BillingActor) {
    const doc = await this.getOrThrow(id);
    if (doc.status === 'confirmed') {
      const extras = await this.resolveExtras(doc);
      return this.toResponse(doc, extras);
    }
    if (doc.status !== 'pending') {
      throw new BadRequestError(`Cannot confirm a payment in status ${doc.status}`);
    }

    doc.status = 'confirmed';
    doc.confirmedAt = new Date();
    doc.unallocatedMinor = recomputeUnallocated(doc);
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(
      this.buildActivity('confirmed', 'Payment verified and confirmed as received', actor),
    );
    await doc.save();

    // Apply any allocations that were staged while pending
    const pendingAllocs = (doc.allocations ?? []).filter((a) => !a.reversedAt);
    if (pendingAllocs.length) {
      // Allocations on pending were stored but invoices not updated — apply now
      for (const alloc of pendingAllocs) {
        // If already applied somehow, skip via invoice balance checks
        try {
          await invoiceService.applyPaymentAllocation(
            String(alloc.invoiceId),
            alloc.amountMinor,
            actor,
            null,
            { paymentId: doc.id, paymentCode: doc.code, allocationKey: alloc.key },
          );
        } catch (error) {
          if (error instanceof BadRequestError || error instanceof ConflictError) {
            // mark allocation reversed if invoice can't accept
            alloc.reversedAt = new Date();
            alloc.reversalReason = error.message;
          } else {
            throw error;
          }
        }
      }
      doc.unallocatedMinor = recomputeUnallocated(doc);
      await doc.save();
    }

    await this.ensureReceipt(doc.id, actor);
    await activityService.record({
      actor: { id: actor.id, fullName: actor.fullName },
      action: 'payment_allocated',
      entityType: 'payment',
      entityId: doc.id,
      entityCode: doc.code,
      clientId: String(doc.clientId),
      message: `Payment confirmed: ${doc.code}`,
      meta: {
        amountMinor: doc.amountMinor,
        currency: doc.currency,
        allocatedMinor: activeAllocatedMinor(doc),
      },
    });
    const fresh = await this.getOrThrow(doc.id);
    const extras = await this.resolveExtras(fresh);
    return this.toResponse(fresh, extras);
  }

  async markFailed(id: string, reason: string, actor: BillingActor) {
    const doc = await this.getOrThrow(id);
    if (doc.status !== 'pending') {
      throw new BadRequestError('Only pending payments can be marked failed');
    }
    if (activeAllocatedMinor(doc) > 0) {
      throw new BadRequestError('Reverse allocations before marking payment failed');
    }
    doc.status = 'failed';
    doc.failedAt = new Date();
    doc.unallocatedMinor = 0;
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(
      this.buildActivity('failed', `Payment marked failed: ${reason.trim()}`, actor),
    );
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }

  private async allocateInternal(
    paymentId: string,
    allocations: Array<{ invoiceId: string; amountMinor: number }>,
    actor: BillingActor,
  ) {
    return withOptionalTransaction(async (session) => {
      const paymentQuery = AgencyPayment.findById(paymentId);
      if (session) paymentQuery.session(session);
      const payment = await paymentQuery.exec();
      if (!payment || payment.isDeleted) throw new NotFoundError('Payment');

      if (!isReceivedStatus(payment.status) && payment.status !== 'pending') {
        throw new BadRequestError('Only pending or confirmed payments can receive allocations');
      }

      const sum = allocations.reduce((s, a) => s + a.amountMinor, 0);
      const available = payment.amountMinor - activeAllocatedMinor(payment);
      if (sum > available) {
        throw new BadRequestError('Allocations exceed unallocated payment balance');
      }

      // Duplicate invoice in same request
      const seen = new Set<string>();
      for (const alloc of allocations) {
        if (seen.has(alloc.invoiceId)) {
          throw new BadRequestError('Duplicate invoice allocation in request');
        }
        seen.add(alloc.invoiceId);
      }

      const newAllocs: IPaymentAllocation[] = [];

      for (const alloc of allocations) {
        assertPositiveMinor(alloc.amountMinor, 'allocation.amountMinor');
        const key = randomUUID();

        // Prevent double-counting: reject if active allocation already exists for same invoice
        const existingActive = (payment.allocations ?? []).find(
          (a) => String(a.invoiceId) === alloc.invoiceId && !a.reversedAt,
        );
        if (existingActive) {
          throw new ConflictError(
            `Payment already has an active allocation to invoice ${alloc.invoiceId}`,
          );
        }

        let invoiceCode: string | undefined;
        if (isReceivedStatus(payment.status)) {
          const invoice = await invoiceService.applyPaymentAllocation(
            alloc.invoiceId,
            alloc.amountMinor,
            actor,
            session,
            { paymentId: payment.id, paymentCode: payment.code, allocationKey: key },
          );
          invoiceCode = invoice.code;
        } else {
          // Pending: store allocation intent without updating invoice balances
          const { AgencyInvoice } = await import('../model/invoice.model');
          const invQuery = AgencyInvoice.findById(alloc.invoiceId);
          if (session) invQuery.session(session);
          const inv = await invQuery.exec();
          if (!inv || inv.isDeleted) throw new NotFoundError('Invoice');
          if (String(inv.clientId) !== String(payment.clientId)) {
            throw new BadRequestError('Invoice client does not match payment client');
          }
          if (alloc.amountMinor > inv.balanceDueMinor) {
            throw new BadRequestError('Allocation exceeds invoice balance');
          }
          invoiceCode = inv.code;
        }

        newAllocs.push({
          key,
          invoiceId: new Types.ObjectId(alloc.invoiceId),
          invoiceCode,
          amountMinor: alloc.amountMinor,
          allocatedAt: new Date(),
        });
      }

      payment.allocations.push(...newAllocs);
      payment.unallocatedMinor = recomputeUnallocated(payment);
      payment.updatedBy = new Types.ObjectId(actor.id);
      payment.activityLog.push(
        this.buildActivity('allocated', `Allocated across ${newAllocs.length} invoice(s)`, actor, {
          allocations: newAllocs.map((a) => ({
            key: a.key,
            invoiceId: String(a.invoiceId),
            amountMinor: a.amountMinor,
          })),
        }),
      );
      if (session) await payment.save({ session });
      else await payment.save();

      if (isReceivedStatus(payment.status)) {
        await this.ensureReceipt(payment.id, actor, session);
      }

      return payment;
    });
  }

  async allocate(
    id: string,
    dto: {
      allocations: Array<{ invoiceId: string; amountMinor: number }>;
      idempotencyKey?: string;
    },
    actor: BillingActor,
  ) {
    if (dto.idempotencyKey) {
      // Soft idempotency: if same key already logged on activity, return current state
      const existing = await AgencyPayment.findById(id).exec();
      if (
        existing?.activityLog?.some(
          (e) => e.meta && (e.meta as { idempotencyKey?: string }).idempotencyKey === dto.idempotencyKey,
        )
      ) {
        const extras = await this.resolveExtras(existing);
        return this.toResponse(existing, extras);
      }
    }

    await this.allocateInternal(id, dto.allocations, actor);

    if (dto.idempotencyKey) {
      const payment = await this.getOrThrow(id);
      payment.activityLog.push(
        this.buildActivity('allocate_idempotent', 'Allocation idempotency recorded', actor, {
          idempotencyKey: dto.idempotencyKey,
        }),
      );
      await payment.save();
    }

    const fresh = await this.getOrThrow(id);
    const extras = await this.resolveExtras(fresh);
    return this.toResponse(fresh, extras);
  }

  async reverseAllocation(
    id: string,
    dto: { allocationKey: string; reason: string },
    actor: BillingActor,
  ) {
    return withOptionalTransaction(async (session) => {
      const query = AgencyPayment.findById(id);
      if (session) query.session(session);
      const payment = await query.exec();
      if (!payment || payment.isDeleted) throw new NotFoundError('Payment');

      const alloc = (payment.allocations ?? []).find((a) => a.key === dto.allocationKey);
      if (!alloc) throw new NotFoundError('Allocation');
      if (alloc.reversedAt) throw new BadRequestError('Allocation already reversed');

      if (isReceivedStatus(payment.status)) {
        await invoiceService.reversePaymentAllocation(
          String(alloc.invoiceId),
          alloc.amountMinor,
          actor,
          session,
          { paymentId: payment.id, allocationKey: alloc.key },
        );
      }

      alloc.reversedAt = new Date();
      alloc.reversalReason = dto.reason.trim();
      payment.unallocatedMinor = recomputeUnallocated(payment);
      payment.updatedBy = new Types.ObjectId(actor.id);
      payment.activityLog.push(
        this.buildActivity('allocation_reversed', `Allocation reversed: ${dto.reason.trim()}`, actor, {
          allocationKey: alloc.key,
          amountMinor: alloc.amountMinor,
        }),
      );
      if (session) await payment.save({ session });
      else await payment.save();

      const extras = await this.resolveExtras(payment);
      return this.toResponse(payment, extras);
    });
  }

  async refund(
    id: string,
    dto: {
      amountMinor: number;
      reason: string;
      method?: PaymentMethod;
      transactionRef?: string;
      idempotencyKey?: string;
    },
    actor: BillingActor,
  ) {
    assertPositiveMinor(dto.amountMinor, 'amountMinor');

    if (dto.idempotencyKey) {
      const existing = await AgencyPayment.findOne({ idempotencyKey: dto.idempotencyKey }).exec();
      if (existing) {
        const extras = await this.resolveExtras(existing);
        return this.toResponse(existing, extras);
      }
    }

    return withOptionalTransaction(async (session) => {
      const query = AgencyPayment.findById(id);
      if (session) query.session(session);
      const original = await query.exec();
      if (!original || original.isDeleted) throw new NotFoundError('Payment');
      if (!isReceivedStatus(original.status) && original.status !== 'refunded') {
        throw new BadRequestError('Only confirmed payments can be refunded');
      }

      const refundable = original.amountMinor; // full original; unallocated preferred but allow after reversing
      if (dto.amountMinor > refundable) {
        throw new BadRequestError('Refund exceeds original payment amount');
      }

      // Prefer refunding from unallocated first; if more, reverse allocations LIFO
      let remaining = dto.amountMinor;
      const active = [...(original.allocations ?? [])]
        .filter((a) => !a.reversedAt)
        .sort((a, b) => b.allocatedAt.getTime() - a.allocatedAt.getTime());

      if (remaining > original.unallocatedMinor) {
        let need = remaining - original.unallocatedMinor;
        for (const alloc of active) {
          if (need <= 0) break;
          const take = Math.min(need, alloc.amountMinor);
          if (take < alloc.amountMinor) {
            throw new BadRequestError(
              'Partial allocation reversal for refunds is not supported — reverse the allocation fully first',
            );
          }
          await invoiceService.reversePaymentAllocation(
            String(alloc.invoiceId),
            alloc.amountMinor,
            actor,
            session,
            { paymentId: original.id, reason: 'refund', allocationKey: alloc.key },
          );
          alloc.reversedAt = new Date();
          alloc.reversalReason = `Refund: ${dto.reason.trim()}`;
          need -= take;
        }
        if (need > 0) {
          throw new BadRequestError('Unable to free enough allocated balance for refund');
        }
      }

      remaining = dto.amountMinor;
      original.unallocatedMinor = recomputeUnallocated(original);
      // Reduce unallocated / effectively mark portion refunded via child payment
      original.status = dto.amountMinor >= original.amountMinor ? 'refunded' : 'confirmed';
      original.updatedBy = new Types.ObjectId(actor.id);
      original.activityLog.push(
        this.buildActivity('refund_initiated', `Refund of ${dto.amountMinor}: ${dto.reason.trim()}`, actor),
      );
      if (session) await original.save({ session });
      else await original.save();

      // Void receipt if fully refunded
      if (original.receiptId && original.status === 'refunded') {
        const receiptQuery = AgencyReceipt.findById(original.receiptId);
        if (session) receiptQuery.session(session);
        const receipt = await receiptQuery.exec();
        if (receipt && !receipt.voidedAt) {
          receipt.voidedAt = new Date();
          receipt.voidReason = `Payment refunded: ${dto.reason.trim()}`;
          if (session) await receipt.save({ session });
          else await receipt.save();
        }
      }

      const refundCode = await allocateAgencyDocumentCode('payment');
      const refundPayment = new AgencyPayment({
        code: refundCode,
        clientId: original.clientId,
        amountMinor: dto.amountMinor,
        currency: original.currency,
        method: dto.method ?? original.method,
        status: 'confirmed',
        paymentDate: new Date(),
        transactionRef: dto.transactionRef,
        notes: `Refund of ${original.code}: ${dto.reason.trim()}`,
        idempotencyKey: dto.idempotencyKey,
        allocations: [],
        unallocatedMinor: 0,
        refundOfPaymentId: original._id,
        confirmedAt: new Date(),
        isActive: true,
        activityLog: [
          this.buildActivity('refund_created', `Refund against ${original.code}`, actor, {
            originalPaymentId: original.id,
            amountMinor: dto.amountMinor,
          }),
        ],
        createdBy: new Types.ObjectId(actor.id),
        updatedBy: new Types.ObjectId(actor.id),
      });
      if (session) await refundPayment.save({ session });
      else await refundPayment.save();

      // Refunds do not get "received" receipts — money went out
      const extras = await this.resolveExtras(refundPayment);
      return this.toResponse(refundPayment, extras);
    });
  }

  /**
   * Issue a receipt only for confirmed payments. Never for pending/failed.
   */
  async ensureReceipt(
    paymentId: string,
    actor: BillingActor,
    session: ClientSession | null = null,
  ) {
    const query = AgencyPayment.findById(paymentId);
    if (session) query.session(session);
    const payment = await query.exec();
    if (!payment) throw new NotFoundError('Payment');

    if (!isReceivedStatus(payment.status)) {
      throw new BadRequestError('Receipts are only issued for confirmed payments');
    }
    if (payment.refundOfPaymentId) {
      throw new BadRequestError('Refund payments do not receive receipts');
    }
    if (payment.receiptId) {
      const existingQuery = AgencyReceipt.findById(payment.receiptId);
      if (session) existingQuery.session(session);
      return existingQuery.exec();
    }

    const client = await this.assertClient(String(payment.clientId));
    const code = await allocateAgencyDocumentCode('receipt');
    const invoiceRefs = (payment.allocations ?? [])
      .filter((a) => !a.reversedAt)
      .map((a) => ({
        invoiceId: a.invoiceId,
        invoiceCode: a.invoiceCode || '',
        amountMinor: a.amountMinor,
      }));

    const receipt = new AgencyReceipt({
      code,
      paymentId: payment._id,
      paymentCode: payment.code,
      clientId: payment.clientId,
      clientName: client.name,
      clientCode: client.code,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      method: payment.method,
      paymentDate: payment.paymentDate,
      transactionRef: payment.transactionRef,
      invoiceRefs,
      issuedAt: new Date(),
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });

    try {
      if (session) await receipt.save({ session });
      else await receipt.save();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        const existing = await AgencyReceipt.findOne({ paymentId: payment._id }).exec();
        return existing;
      }
      throw error;
    }

    payment.receiptId = receipt._id as Types.ObjectId;
    payment.activityLog.push(
      this.buildActivity('receipt_issued', `Receipt ${receipt.code} issued`, actor, {
        receiptId: receipt.id,
      }),
    );
    if (session) await payment.save({ session });
    else await payment.save();

    return receipt;
  }

  async getReceipt(paymentId: string, _actor: BillingActor) {
    const payment = await this.getOrThrow(paymentId);
    if (!payment.receiptId) throw new NotFoundError('Receipt');
    const receipt = await AgencyReceipt.findById(payment.receiptId).exec();
    if (!receipt) throw new NotFoundError('Receipt');
    return this.receiptToResponse(receipt);
  }

  async listReceipts(
    query: PaginationQuery & { search?: string; clientId?: string; paymentId?: string },
    _actor: BillingActor,
  ) {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'issuedAt',
      order: query.order ?? 'desc',
    });
    const filter: Filter = {
      ...buildSearchFilter(query.search, ['code', 'paymentCode', 'clientName', 'transactionRef']),
      isDeleted: { $ne: true },
    };
    if (query.clientId) filter.clientId = query.clientId;
    if (query.paymentId) filter.paymentId = query.paymentId;

    const [items, total] = await Promise.all([
      AgencyReceipt.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      AgencyReceipt.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((r) => this.receiptToResponse(r)),
      meta: buildPaginationMeta(total, page, limit) as PaginationMeta,
    };
  }

  async getReceiptById(id: string, _actor: BillingActor) {
    const receipt = await AgencyReceipt.findById(id).exec();
    if (!receipt || receipt.isDeleted) throw new NotFoundError('Receipt');
    return this.receiptToResponse(receipt);
  }

  async generateReceiptPdf(id: string, _actor: BillingActor) {
    const receipt = await AgencyReceipt.findById(id).exec();
    if (!receipt || receipt.isDeleted) throw new NotFoundError('Receipt');
    if (receipt.voidedAt) {
      // Still allow PDF of voided receipt with VOID mark
    }
    const buffer = await buildReceiptPdfBuffer(receipt);
    return {
      buffer,
      filename: `${receipt.code}.pdf`,
      contentType: 'application/pdf',
    };
  }

  private receiptToResponse(receipt: InstanceType<typeof AgencyReceipt>) {
    return {
      id: receipt.id,
      code: receipt.code,
      paymentId: String(receipt.paymentId),
      paymentCode: receipt.paymentCode,
      clientId: String(receipt.clientId),
      clientName: receipt.clientName,
      clientCode: receipt.clientCode,
      amountMinor: receipt.amountMinor,
      currency: receipt.currency,
      method: receipt.method,
      paymentDate: receipt.paymentDate.toISOString(),
      transactionRef: receipt.transactionRef,
      invoiceRefs: (receipt.invoiceRefs ?? []).map((r) => ({
        invoiceId: String(r.invoiceId),
        invoiceCode: r.invoiceCode,
        amountMinor: r.amountMinor,
      })),
      issuedAt: receipt.issuedAt.toISOString(),
      voidedAt: receipt.voidedAt?.toISOString(),
      voidReason: receipt.voidReason,
      createdAt: receipt.createdAt.toISOString(),
      updatedAt: receipt.updatedAt.toISOString(),
    };
  }

  async addNote(id: string, note: string, actor: BillingActor) {
    const doc = await this.getOrThrow(id);
    doc.activityLog.push(this.buildActivity('note', note.trim(), actor));
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    const extras = await this.resolveExtras(doc);
    return this.toResponse(doc, extras);
  }
}

export const paymentService = new PaymentService();
