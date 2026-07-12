import { Types } from 'mongoose';
import { CtaActionType, OfferType } from '@core/constants/leads';
import { EntityStatus } from '@core/schemas/base.schema';
import { ICtaAction, IDisplayRules } from '@core/schemas/lead-gen.schema';
import { BadRequestError, NotFoundError } from '@core/errors';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import { IOffer, Offer } from '../model/offer.model';
import {
  DisplayContext,
  matchesDisplayRules,
  sortByPriorityDesc,
} from '../utils/display-rules';

export type CreateOfferDto = {
  title: string;
  description?: string;
  offerType?: OfferType;
  valueLabel?: string;
  bannerText?: string;
  countdownEnabled?: boolean;
  expiresAt?: Date | null;
  ctaAction?: Partial<ICtaAction>;
  applicableIndustries?: string[];
  applicableServices?: string[];
  displayRules?: Partial<IDisplayRules>;
  priority?: number;
  campaignId?: string | null;
  status?: EntityStatus;
};

export type UpdateOfferDto = Partial<CreateOfferDto>;

export type OfferResponse = {
  id: string;
  title: string;
  description?: string;
  offerType: OfferType;
  valueLabel?: string;
  bannerText?: string;
  countdownEnabled: boolean;
  expiresAt?: string | null;
  ctaAction: ICtaAction;
  applicableIndustries: string[];
  applicableServices: string[];
  displayRules: IDisplayRules;
  priority: number;
  campaignId?: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

export type ListOffersQuery = {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  status?: EntityStatus;
  offerType?: OfferType;
  industry?: string;
  includeTrash?: boolean;
  trashOnly?: boolean;
};

function toObjectId(value: string | null | undefined): Types.ObjectId | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return new Types.ObjectId(value);
}

function mapCta(cta: ICtaAction | undefined): ICtaAction {
  return {
    type: cta?.type ?? CtaActionType.LINK,
    label: cta?.label,
    url: cta?.url,
    formId: cta?.formId ?? null,
    offerId: cta?.offerId ?? null,
    magnetId: cta?.magnetId ?? null,
    popupId: cta?.popupId ?? null,
    phone: cta?.phone,
    whatsappNumber: cta?.whatsappNumber,
  };
}

function mapOffer(doc: IOffer): OfferResponse {
  return {
    id: doc.id,
    title: doc.title,
    description: doc.description,
    offerType: doc.offerType,
    valueLabel: doc.valueLabel,
    bannerText: doc.bannerText,
    countdownEnabled: doc.countdownEnabled,
    expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
    ctaAction: mapCta(doc.ctaAction),
    applicableIndustries: doc.applicableIndustries ?? [],
    applicableServices: doc.applicableServices ?? [],
    displayRules: doc.displayRules,
    priority: doc.priority,
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

function isExpired(doc: IOffer, now: Date): boolean {
  return Boolean(doc.expiresAt && doc.expiresAt < now);
}

function matchesIndustryFilters(doc: IOffer, industry?: string): boolean {
  if (!industry) return true;
  const needle = industry.toLowerCase();
  if (doc.applicableIndustries?.length) {
    if (!doc.applicableIndustries.some((i) => i.toLowerCase() === needle)) return false;
  }
  return true;
}

export class OfferService {
  async list(query: ListOffersQuery): Promise<{ offers: OfferResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);
    const filter: Record<string, unknown> = {
      ...buildSearchFilter(query.search, ['title', 'description', 'bannerText', 'valueLabel']),
    };

    if (query.trashOnly) filter.isDeleted = true;
    else if (!query.includeTrash) filter.isDeleted = { $ne: true };

    if (query.status) filter.status = query.status;
    if (query.offerType) filter.offerType = query.offerType;
    if (query.industry) {
      filter.$or = [
        { applicableIndustries: { $size: 0 } },
        { applicableIndustries: query.industry },
        { 'displayRules.industries': { $size: 0 } },
        { 'displayRules.industries': query.industry },
      ];
    }

    const findQuery = Offer.find(filter).sort(sort).skip(skip).limit(limit);
    const countQuery = Offer.countDocuments(filter);

    if (query.trashOnly || query.includeTrash) {
      findQuery.setOptions({ includeDeleted: true });
      countQuery.setOptions({ includeDeleted: true });
    }

    const [docs, total] = await Promise.all([findQuery.exec(), countQuery.exec()]);
    return {
      offers: docs.map(mapOffer),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<OfferResponse> {
    const doc = await Offer.findById(id);
    if (!doc) throw new NotFoundError('Offer not found');
    return mapOffer(doc);
  }

  async listPublishedForContext(
    context: DisplayContext,
    limit = 5,
  ): Promise<OfferResponse[]> {
    const now = context.now ?? new Date();
    const docs = await Offer.find({
      status: EntityStatus.PUBLISHED,
      isDeleted: { $ne: true },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .sort({ priority: -1 })
      .limit(100)
      .exec();

    const matched = docs.filter(
      (doc) =>
        !isExpired(doc, now) &&
        matchesIndustryFilters(doc, context.industry) &&
        matchesDisplayRules(doc.displayRules, context),
    );

    return sortByPriorityDesc(matched).slice(0, limit).map(mapOffer);
  }

  async create(dto: CreateOfferDto, userId: string): Promise<OfferResponse> {
    if (!dto.title?.trim()) throw new BadRequestError('Title is required');

    const doc = await Offer.create({
      title: dto.title,
      description: dto.description,
      offerType: dto.offerType ?? OfferType.CUSTOM,
      valueLabel: dto.valueLabel,
      bannerText: dto.bannerText,
      countdownEnabled: dto.countdownEnabled ?? false,
      expiresAt: dto.expiresAt ?? null,
      ctaAction: {
        type: dto.ctaAction?.type ?? CtaActionType.LINK,
        label: dto.ctaAction?.label,
        url: dto.ctaAction?.url,
        formId: toObjectId(dto.ctaAction?.formId?.toString()),
        offerId: toObjectId(dto.ctaAction?.offerId?.toString()),
        magnetId: toObjectId(dto.ctaAction?.magnetId?.toString()),
        popupId: toObjectId(dto.ctaAction?.popupId?.toString()),
        phone: dto.ctaAction?.phone,
        whatsappNumber: dto.ctaAction?.whatsappNumber,
      },
      applicableIndustries: dto.applicableIndustries ?? [],
      applicableServices: dto.applicableServices ?? [],
      displayRules: dto.displayRules,
      priority: dto.priority ?? dto.displayRules?.priority ?? 0,
      campaignId: toObjectId(dto.campaignId),
      status: dto.status ?? EntityStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    return mapOffer(doc);
  }

  async update(id: string, dto: UpdateOfferDto, userId: string): Promise<OfferResponse> {
    const doc = await Offer.findById(id);
    if (!doc) throw new NotFoundError('Offer not found');

    if (dto.title !== undefined) doc.title = dto.title;
    if (dto.description !== undefined) doc.description = dto.description;
    if (dto.offerType !== undefined) doc.offerType = dto.offerType;
    if (dto.valueLabel !== undefined) doc.valueLabel = dto.valueLabel;
    if (dto.bannerText !== undefined) doc.bannerText = dto.bannerText;
    if (dto.countdownEnabled !== undefined) doc.countdownEnabled = dto.countdownEnabled;
    if (dto.expiresAt !== undefined) doc.expiresAt = dto.expiresAt;
    if (dto.applicableIndustries !== undefined) {
      doc.applicableIndustries = dto.applicableIndustries;
    }
    if (dto.applicableServices !== undefined) {
      doc.applicableServices = dto.applicableServices;
    }
    if (dto.displayRules !== undefined) {
      doc.displayRules = mergeDisplayRules(doc.displayRules, dto.displayRules);
    }
    if (dto.priority !== undefined) doc.priority = dto.priority;
    if (dto.campaignId !== undefined) doc.campaignId = toObjectId(dto.campaignId) ?? null;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.ctaAction !== undefined) {
      doc.ctaAction = {
        type: dto.ctaAction.type ?? doc.ctaAction?.type ?? CtaActionType.LINK,
        label: dto.ctaAction.label ?? doc.ctaAction?.label,
        url: dto.ctaAction.url ?? doc.ctaAction?.url,
        formId:
          dto.ctaAction.formId !== undefined
            ? toObjectId(dto.ctaAction.formId?.toString()) ?? null
            : doc.ctaAction?.formId,
        offerId:
          dto.ctaAction.offerId !== undefined
            ? toObjectId(dto.ctaAction.offerId?.toString()) ?? null
            : doc.ctaAction?.offerId,
        magnetId:
          dto.ctaAction.magnetId !== undefined
            ? toObjectId(dto.ctaAction.magnetId?.toString()) ?? null
            : doc.ctaAction?.magnetId,
        popupId:
          dto.ctaAction.popupId !== undefined
            ? toObjectId(dto.ctaAction.popupId?.toString()) ?? null
            : doc.ctaAction?.popupId,
        phone: dto.ctaAction.phone ?? doc.ctaAction?.phone,
        whatsappNumber: dto.ctaAction.whatsappNumber ?? doc.ctaAction?.whatsappNumber,
      };
    }

    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapOffer(doc);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const doc = await Offer.findById(id);
    if (!doc) throw new NotFoundError('Offer not found');
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.status = EntityStatus.DELETED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
  }

  async restore(id: string, userId: string): Promise<OfferResponse> {
    const doc = await Offer.findById(id).setOptions({ includeDeleted: true });
    if (!doc) throw new NotFoundError('Offer not found');
    doc.isDeleted = false;
    doc.deletedAt = undefined;
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapOffer(doc);
  }

  async publish(id: string, userId: string): Promise<OfferResponse> {
    const doc = await Offer.findById(id);
    if (!doc) throw new NotFoundError('Offer not found');
    doc.status = EntityStatus.PUBLISHED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapOffer(doc);
  }

  async unpublish(id: string, userId: string): Promise<OfferResponse> {
    const doc = await Offer.findById(id);
    if (!doc) throw new NotFoundError('Offer not found');
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapOffer(doc);
  }
}

export const offerService = new OfferService();
