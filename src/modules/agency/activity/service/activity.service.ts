import { Types } from 'mongoose';
import { BadRequestError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import {
  AgencyActivity,
  ActivityEntityType,
  FINANCIAL_IMMUTABLE_ACTIONS,
  IAgencyActivity,
} from '../model/activity.model';

const SECRET_META_KEYS = /password|secret|token|api[_-]?key|ciphertext|authTag|privateKey/i;

export type ActivityActor = {
  id?: string;
  email?: string;
  fullName?: string;
};

export type RecordActivityInput = {
  actor?: ActivityActor;
  action: string;
  entityType: ActivityEntityType;
  entityId?: string | null;
  entityCode?: string;
  clientId?: string | null;
  projectId?: string | null;
  message: string;
  meta?: Record<string, unknown>;
  /** Force immutable; financial actions are always immutable. */
  immutable?: boolean;
};

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SECRET_META_KEYS.test(key)) continue;
    if (typeof value === 'string' && value.length > 500) {
      out[key] = `${value.slice(0, 100)}…[truncated]`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

function sanitizeMessage(message: string): string {
  return message
    .replace(/(password|api[_-]?key|token|secret)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .slice(0, 500);
}

export class ActivityService {
  async record(input: RecordActivityInput): Promise<IAgencyActivity | null> {
    try {
      const immutable =
        Boolean(input.immutable) || FINANCIAL_IMMUTABLE_ACTIONS.has(input.action);
      const doc = await AgencyActivity.create({
        actorId: input.actor?.id ? new Types.ObjectId(input.actor.id) : null,
        actorEmail: input.actor?.email,
        actorName: input.actor?.fullName || input.actor?.email,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ? new Types.ObjectId(input.entityId) : null,
        entityCode: input.entityCode,
        clientId: input.clientId ? new Types.ObjectId(input.clientId) : null,
        projectId: input.projectId ? new Types.ObjectId(input.projectId) : null,
        message: sanitizeMessage(input.message),
        meta: sanitizeMeta(input.meta),
        immutable,
      });
      return doc;
    } catch (err) {
      // Activity must never break primary business flows
      loggers.admin.warn('Failed to record agency activity', {
        action: input.action,
        error: (err as Error).message,
      });
      return null;
    }
  }

  private toResponse(doc: IAgencyActivity) {
    return {
      id: doc.id,
      actorId: doc.actorId ? String(doc.actorId) : null,
      actorEmail: doc.actorEmail,
      actorName: doc.actorName,
      action: doc.action,
      entityType: doc.entityType,
      entityId: doc.entityId ? String(doc.entityId) : null,
      entityCode: doc.entityCode,
      clientId: doc.clientId ? String(doc.clientId) : null,
      projectId: doc.projectId ? String(doc.projectId) : null,
      message: doc.message,
      meta: doc.meta,
      immutable: doc.immutable,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  async list(
    query: PaginationQuery & {
      clientId?: string;
      projectId?: string;
      entityType?: ActivityEntityType;
      action?: string;
      from?: Date;
      to?: Date;
    },
  ): Promise<{ items: ReturnType<ActivityService['toResponse']>[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'createdAt',
      order: query.order ?? 'desc',
    });
    const filter: Record<string, unknown> = {};
    if (query.clientId) filter.clientId = new Types.ObjectId(query.clientId);
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.entityType) filter.entityType = query.entityType;
    if (query.action) filter.action = query.action;
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) (filter.createdAt as Record<string, Date>).$gte = query.from;
      if (query.to) (filter.createdAt as Record<string, Date>).$lte = query.to;
    }

    const [docs, total] = await Promise.all([
      AgencyActivity.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      AgencyActivity.countDocuments(filter),
    ]);
    return {
      items: docs.map((d) => this.toResponse(d)),
      meta: buildPaginationMeta(total, page, limit) as PaginationMeta,
    };
  }

  async getById(id: string) {
    const doc = await AgencyActivity.findById(id).exec();
    if (!doc) throw new NotFoundError('Activity');
    return this.toResponse(doc);
  }

  /** Historical financial (and other immutable) events cannot be silently modified. */
  async assertNotImmutable(id: string) {
    const doc = await AgencyActivity.findById(id).exec();
    if (!doc) throw new NotFoundError('Activity');
    if (doc.immutable) {
      throw new BadRequestError(
        'Immutable historical events cannot be modified or deleted. Financial audit entries are protected.',
      );
    }
    return doc;
  }
}

export const activityService = new ActivityService();
