import { Types } from 'mongoose';
import { PopupTrigger } from '@core/constants/leads';
import { EntityStatus } from '@core/schemas/base.schema';
import { IDisplayRules, IFrequencyControl } from '@core/schemas/lead-gen.schema';
import { BadRequestError, NotFoundError } from '@core/errors';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import {
  IPopupCampaign,
  IPopupContent,
  IPopupTriggerConfig,
  PopupCampaign,
} from '../model/popup-campaign.model';
import {
  DisplayContext,
  matchesDisplayRules,
  sortByPriorityDesc,
} from '../utils/display-rules';

export type CreatePopupDto = {
  name: string;
  trigger?: PopupTrigger;
  triggerConfig?: IPopupTriggerConfig;
  content?: {
    headline?: string;
    body?: string;
    formId?: string | null;
    offerId?: string | null;
    magnetId?: string | null;
    imageUrl?: string;
  };
  frequencyControl?: IFrequencyControl;
  displayRules?: Partial<IDisplayRules>;
  campaignId?: string | null;
  status?: EntityStatus;
};

export type UpdatePopupDto = Partial<CreatePopupDto>;

export type PopupResponse = {
  id: string;
  name: string;
  trigger: PopupTrigger;
  triggerConfig: IPopupTriggerConfig;
  content: {
    headline?: string;
    body?: string;
    formId?: string | null;
    offerId?: string | null;
    magnetId?: string | null;
    imageUrl?: string;
  };
  frequencyControl: IFrequencyControl;
  displayRules: IDisplayRules;
  campaignId?: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

export type ListPopupsQuery = {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  status?: EntityStatus;
  trigger?: PopupTrigger;
  includeTrash?: boolean;
  trashOnly?: boolean;
};

function toObjectId(value: string | null | undefined): Types.ObjectId | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return new Types.ObjectId(value);
}

function mapContent(content: IPopupContent | undefined) {
  return {
    headline: content?.headline,
    body: content?.body,
    formId: content?.formId?.toString() ?? null,
    offerId: content?.offerId?.toString() ?? null,
    magnetId: content?.magnetId?.toString() ?? null,
    imageUrl: content?.imageUrl,
  };
}

function mapPopup(doc: IPopupCampaign): PopupResponse {
  return {
    id: doc.id,
    name: doc.name,
    trigger: doc.trigger,
    triggerConfig: doc.triggerConfig ?? {},
    content: mapContent(doc.content),
    frequencyControl: doc.frequencyControl ?? {},
    displayRules: doc.displayRules,
    campaignId: doc.campaignId?.toString() ?? null,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function mergeDisplayRules(
  existing: IDisplayRules,
  patch?: Partial<IDisplayRules>,
): IDisplayRules {
  if (!patch) return existing;
  return {
    industries: patch.industries ?? existing.industries,
    services: patch.services ?? existing.services,
    pagePaths: patch.pagePaths ?? existing.pagePaths,
    pageTypes: patch.pageTypes ?? existing.pageTypes,
    devices: patch.devices ?? existing.devices,
    excludePaths: patch.excludePaths ?? existing.excludePaths,
    priority: patch.priority ?? existing.priority,
    startAt: patch.startAt !== undefined ? patch.startAt : existing.startAt,
    endAt: patch.endAt !== undefined ? patch.endAt : existing.endAt,
  };
}

function buildContent(input?: CreatePopupDto['content']): Partial<IPopupContent> | undefined {
  if (!input) return undefined;
  return {
    headline: input.headline,
    body: input.body,
    formId: toObjectId(input.formId) ?? null,
    offerId: toObjectId(input.offerId) ?? null,
    magnetId: toObjectId(input.magnetId) ?? null,
    imageUrl: input.imageUrl,
  };
}

export class PopupService {
  async list(query: ListPopupsQuery): Promise<{ popups: PopupResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);
    const filter: Record<string, unknown> = {
      ...buildSearchFilter(query.search, ['name', 'content.headline', 'content.body']),
    };

    if (query.trashOnly) filter.isDeleted = true;
    else if (!query.includeTrash) filter.isDeleted = { $ne: true };
    if (query.status) filter.status = query.status;
    if (query.trigger) filter.trigger = query.trigger;

    const findQuery = PopupCampaign.find(filter).sort(sort).skip(skip).limit(limit);
    const countQuery = PopupCampaign.countDocuments(filter);

    if (query.trashOnly || query.includeTrash) {
      findQuery.setOptions({ includeDeleted: true });
      countQuery.setOptions({ includeDeleted: true });
    }

    const [docs, total] = await Promise.all([findQuery.exec(), countQuery.exec()]);
    return {
      popups: docs.map(mapPopup),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<PopupResponse> {
    const doc = await PopupCampaign.findById(id);
    if (!doc) throw new NotFoundError('Popup campaign not found');
    return mapPopup(doc);
  }

  /**
   * Returns matching published popups for a page context.
   * Client applies frequency/cookie rules; server returns config needed to do so.
   */
  async listPublishedForContext(
    context: DisplayContext & { trigger?: PopupTrigger },
    limit = 3,
  ): Promise<PopupResponse[]> {
    const filter: Record<string, unknown> = {
      status: EntityStatus.PUBLISHED,
      isDeleted: { $ne: true },
    };
    if (context.trigger) filter.trigger = context.trigger;

    const docs = await PopupCampaign.find(filter)
      .sort({ 'displayRules.priority': -1 })
      .limit(50)
      .exec();

    const matched = docs.filter((doc) => matchesDisplayRules(doc.displayRules, context));

    return sortByPriorityDesc(
      matched.map((doc) => ({
        doc,
        priority: doc.displayRules?.priority ?? 0,
        displayRules: doc.displayRules,
      })),
    )
      .slice(0, limit)
      .map((item) => mapPopup(item.doc));
  }

  async create(dto: CreatePopupDto, userId: string): Promise<PopupResponse> {
    if (!dto.name?.trim()) throw new BadRequestError('Name is required');

    const trigger = dto.trigger ?? PopupTrigger.TIME_DELAY;
    const triggerConfig = dto.triggerConfig ?? {};

    if (trigger === PopupTrigger.SCROLL && triggerConfig.scrollPercentage === undefined) {
      triggerConfig.scrollPercentage = 50;
    }
    if (trigger === PopupTrigger.TIME_DELAY && triggerConfig.delayMs === undefined) {
      triggerConfig.delayMs = 15000;
    }

    const doc = await PopupCampaign.create({
      name: dto.name,
      trigger,
      triggerConfig,
      content: buildContent(dto.content) ?? {},
      frequencyControl: {
        cookieKey: dto.frequencyControl?.cookieKey,
        maxShows: dto.frequencyControl?.maxShows ?? 1,
        cooldownHours: dto.frequencyControl?.cooldownHours ?? 168,
        oncePerSession: dto.frequencyControl?.oncePerSession ?? true,
      },
      displayRules: dto.displayRules,
      campaignId: toObjectId(dto.campaignId),
      status: dto.status ?? EntityStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    return mapPopup(doc);
  }

  async update(id: string, dto: UpdatePopupDto, userId: string): Promise<PopupResponse> {
    const doc = await PopupCampaign.findById(id);
    if (!doc) throw new NotFoundError('Popup campaign not found');

    if (dto.name !== undefined) doc.name = dto.name;
    if (dto.trigger !== undefined) doc.trigger = dto.trigger;
    if (dto.triggerConfig !== undefined) {
      doc.triggerConfig = { ...doc.triggerConfig, ...dto.triggerConfig };
    }
    if (dto.content !== undefined) {
      const next = buildContent(dto.content)!;
      doc.content = {
        headline: next.headline ?? doc.content?.headline,
        body: next.body ?? doc.content?.body,
        formId: dto.content.formId !== undefined ? (toObjectId(dto.content.formId) ?? null) : doc.content?.formId,
        offerId: dto.content.offerId !== undefined ? (toObjectId(dto.content.offerId) ?? null) : doc.content?.offerId,
        magnetId:
          dto.content.magnetId !== undefined ? (toObjectId(dto.content.magnetId) ?? null) : doc.content?.magnetId,
        imageUrl: next.imageUrl ?? doc.content?.imageUrl,
      };
    }
    if (dto.frequencyControl !== undefined) {
      doc.frequencyControl = { ...doc.frequencyControl, ...dto.frequencyControl };
    }
    if (dto.displayRules !== undefined) {
      doc.displayRules = mergeDisplayRules(doc.displayRules, dto.displayRules);
    }
    if (dto.campaignId !== undefined) doc.campaignId = toObjectId(dto.campaignId) ?? null;
    if (dto.status !== undefined) doc.status = dto.status;

    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapPopup(doc);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const doc = await PopupCampaign.findById(id);
    if (!doc) throw new NotFoundError('Popup campaign not found');
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.status = EntityStatus.DELETED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
  }

  async restore(id: string, userId: string): Promise<PopupResponse> {
    const doc = await PopupCampaign.findById(id).setOptions({ includeDeleted: true });
    if (!doc) throw new NotFoundError('Popup campaign not found');
    doc.isDeleted = false;
    doc.deletedAt = undefined;
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapPopup(doc);
  }

  async publish(id: string, userId: string): Promise<PopupResponse> {
    const doc = await PopupCampaign.findById(id);
    if (!doc) throw new NotFoundError('Popup campaign not found');
    doc.status = EntityStatus.PUBLISHED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapPopup(doc);
  }

  async unpublish(id: string, userId: string): Promise<PopupResponse> {
    const doc = await PopupCampaign.findById(id);
    if (!doc) throw new NotFoundError('Popup campaign not found');
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapPopup(doc);
  }
}

export const popupService = new PopupService();
