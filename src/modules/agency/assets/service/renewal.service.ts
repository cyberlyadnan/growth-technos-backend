import { Types } from 'mongoose';
import { BadRequestError, NotFoundError } from '@core/errors';
import { env } from '@core/config';
import { loggers } from '@core/logger';
import { mailService } from '@core/mail/mail.service';
import { buildPaginationMeta, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import { UserRole } from '@core/constants';
import { AgencyClient } from '@modules/agency/clients/model/client.model';
import { allocateAgencyDocumentCode } from '@modules/agency/clients/service/number-sequence.service';
import { AgencyAsset } from '../model/asset.model';
import { activityService } from '@modules/agency/activity/service/activity.service';
import {
  AgencyRenewal,
  IAgencyRenewal,
  NotificationChannel,
  NotificationDeliveryStatus,
  RenewalKind,
  RenewalStatus,
} from '../model/renewal.model';

export type RenewalActor = {
  id: string;
  role: UserRole | string;
  fullName?: string;
};

export type CreateRenewalDto = {
  assetId: string;
  kind: RenewalKind;
  title: string;
  dueDate: Date;
  remindAt: Date;
  channels?: NotificationChannel[];
  notes?: string;
};

export type UpdateRenewalDto = Partial<CreateRenewalDto> & {
  status?: RenewalStatus;
};

export type ListRenewalsQuery = PaginationQuery & {
  clientId?: string;
  assetId?: string;
  kind?: RenewalKind;
  status?: RenewalStatus;
  dueBefore?: Date;
};

export class RenewalService {
  private async getOrThrow(id: string): Promise<IAgencyRenewal> {
    const doc = await AgencyRenewal.findById(id).exec();
    if (!doc || doc.isDeleted) throw new NotFoundError('Renewal');
    return doc;
  }

  private toResponse(doc: IAgencyRenewal) {
    return {
      id: doc.id,
      code: doc.code,
      assetId: String(doc.assetId),
      clientId: String(doc.clientId),
      kind: doc.kind,
      title: doc.title,
      dueDate: doc.dueDate.toISOString(),
      remindAt: doc.remindAt.toISOString(),
      channels: doc.channels,
      status: doc.status,
      lastNotificationStatus: doc.lastNotificationStatus,
      lastNotifiedAt: doc.lastNotifiedAt?.toISOString(),
      notificationNote: doc.notificationNote,
      completedAt: doc.completedAt?.toISOString(),
      notes: doc.notes,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      /**
       * Honest delivery flag — true only when an email was actually handed to SMTP.
       * in_app is recorded as queued; email may be skipped when SMTP is unconfigured.
       */
      emailDeliveryClaimed: doc.lastNotificationStatus === 'email_sent',
    };
  }

  async list(
    query: ListRenewalsQuery,
  ): Promise<{ items: ReturnType<RenewalService['toResponse']>[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'dueDate',
      order: query.order ?? 'asc',
    });
    const filter: Record<string, unknown> = {};
    if (query.clientId) filter.clientId = new Types.ObjectId(query.clientId);
    if (query.assetId) filter.assetId = new Types.ObjectId(query.assetId);
    if (query.kind) filter.kind = query.kind;
    if (query.status) filter.status = query.status;
    if (query.dueBefore) filter.dueDate = { $lte: query.dueBefore };

    const [docs, total] = await Promise.all([
      AgencyRenewal.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      AgencyRenewal.countDocuments(filter),
    ]);
    return {
      items: docs.map((d) => this.toResponse(d)),
      meta: buildPaginationMeta(total, page, limit) as PaginationMeta,
    };
  }

  async getById(id: string) {
    return this.toResponse(await this.getOrThrow(id));
  }

  async create(dto: CreateRenewalDto, actor: RenewalActor) {
    const asset = await AgencyAsset.findById(dto.assetId).exec();
    if (!asset || asset.isDeleted) throw new BadRequestError('Asset not found');
    if (dto.remindAt > dto.dueDate) {
      throw new BadRequestError('remindAt must be on or before dueDate');
    }
    const channels = dto.channels?.length ? dto.channels : (['in_app'] as NotificationChannel[]);
    const code = await allocateAgencyDocumentCode('renewal');
    const doc = await AgencyRenewal.create({
      code,
      assetId: asset._id,
      clientId: asset.clientId,
      kind: dto.kind,
      title: dto.title.trim(),
      dueDate: dto.dueDate,
      remindAt: dto.remindAt,
      channels,
      notes: dto.notes?.trim(),
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });
    await activityService.record({
      actor: { id: actor.id, fullName: actor.fullName },
      action: 'renewal_created',
      entityType: 'renewal',
      entityId: doc.id,
      entityCode: doc.code,
      clientId: String(doc.clientId),
      message: `Renewal scheduled: ${doc.title}`,
      meta: { kind: doc.kind, dueDate: doc.dueDate.toISOString() },
    });
    return this.toResponse(doc);
  }

  async update(id: string, dto: UpdateRenewalDto, actor: RenewalActor) {
    const doc = await this.getOrThrow(id);
    if (dto.assetId && dto.assetId !== String(doc.assetId)) {
      const asset = await AgencyAsset.findById(dto.assetId).exec();
      if (!asset || asset.isDeleted) throw new BadRequestError('Asset not found');
      doc.assetId = asset._id as Types.ObjectId;
      doc.clientId = asset.clientId;
    }
    if (dto.kind !== undefined) doc.kind = dto.kind;
    if (dto.title !== undefined) doc.title = dto.title.trim();
    if (dto.dueDate !== undefined) doc.dueDate = dto.dueDate;
    if (dto.remindAt !== undefined) doc.remindAt = dto.remindAt;
    if (dto.channels !== undefined) doc.channels = dto.channels;
    if (dto.notes !== undefined) doc.notes = dto.notes?.trim();
    if (dto.status !== undefined) {
      doc.status = dto.status;
      if (dto.status === 'completed') doc.completedAt = new Date();
    }
    if (doc.remindAt > doc.dueDate) {
      throw new BadRequestError('remindAt must be on or before dueDate');
    }
    doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    if (dto.status !== undefined) {
      await activityService.record({
        actor: { id: actor.id, fullName: actor.fullName },
        action: dto.status === 'completed' ? 'renewal_completed' : 'renewal_updated',
        entityType: 'renewal',
        entityId: doc.id,
        entityCode: doc.code,
        clientId: String(doc.clientId),
        message: `Renewal ${dto.status}: ${doc.code}`,
        meta: { status: doc.status },
      });
    }
    return this.toResponse(doc);
  }

  async complete(id: string, actor: RenewalActor) {
    return this.update(id, { status: 'completed' }, actor);
  }

  async cancel(id: string, actor: RenewalActor) {
    return this.update(id, { status: 'cancelled' }, actor);
  }

  /**
   * Process due reminders. Uses mailService when SMTP is configured.
   * Does not claim email delivery when SMTP is unavailable.
   */
  async processDueReminders(now = new Date()) {
    const due = await AgencyRenewal.find({
      status: 'pending',
      remindAt: { $lte: now },
      isDeleted: { $ne: true },
    })
      .limit(100)
      .exec();

    const results: Array<{
      id: string;
      code: string;
      lastNotificationStatus: NotificationDeliveryStatus;
      notificationNote?: string;
    }> = [];

    for (const doc of due) {
      const channels = doc.channels?.length ? doc.channels : (['in_app'] as NotificationChannel[]);
      let status: NotificationDeliveryStatus = 'queued_in_app';
      let note = 'In-app reminder recorded.';

      if (channels.includes('email')) {
        const client = await AgencyClient.findById(doc.clientId).select('email name').exec();
        const to = client?.email;
        if (!to) {
          status = 'email_failed';
          note = 'In-app recorded; email skipped — client has no email.';
        } else if (!mailService.isConfigured()) {
          status = 'email_skipped_unconfigured';
          note =
            'In-app reminder recorded. Email not sent — SMTP is not configured. Delivery is not claimed.';
          loggers.email.warn('Renewal email skipped — SMTP unconfigured', {
            renewalId: doc.id,
            code: doc.code,
          });
        } else {
          try {
            await mailService.send({
              to,
              subject: `Renewal reminder: ${doc.title}`,
              html: `<p>Reminder for <strong>${doc.title}</strong>.</p><p>Due: ${doc.dueDate.toISOString().slice(0, 10)}</p>`,
              text: `Reminder for ${doc.title}. Due: ${doc.dueDate.toISOString().slice(0, 10)}`,
            });
            status = 'email_sent';
            note = 'In-app recorded; email accepted by SMTP transport.';
          } catch (err) {
            status = 'email_failed';
            note = 'In-app recorded; email send failed.';
            loggers.email.error('Renewal email failed', {
              renewalId: doc.id,
              error: (err as Error).message,
            });
          }
        }
      }

      doc.status = 'reminded';
      doc.lastNotificationStatus = status;
      doc.lastNotifiedAt = now;
      doc.notificationNote = note;
      await doc.save();
      results.push({
        id: doc.id,
        code: doc.code,
        lastNotificationStatus: status,
        notificationNote: note,
      });
    }

    return {
      processed: results.length,
      results,
      smtpConfigured: mailService.isConfigured(),
      disclaimer:
        'email_sent means the message was handed to the configured SMTP transport. Other statuses do not claim delivery.',
    };
  }
}

export const renewalService = new RenewalService();

let renewalInterval: ReturnType<typeof setInterval> | null = null;

/** Start in-process reminder polling when enabled (BullMQ workers are not wired yet). */
export function startRenewalReminderScheduler(): void {
  if (!env.AGENCY_RENEWAL_REMINDER_ENABLED) return;
  if (renewalInterval) return;
  const tick = () => {
    renewalService.processDueReminders().catch((err) => {
      loggers.queue.error('Renewal reminder tick failed', { error: (err as Error).message });
    });
  };
  tick();
  renewalInterval = setInterval(tick, env.AGENCY_RENEWAL_REMINDER_INTERVAL_MS);
  renewalInterval.unref?.();
  loggers.queue.info('Agency renewal reminder scheduler started', {
    intervalMs: env.AGENCY_RENEWAL_REMINDER_INTERVAL_MS,
  });
}
