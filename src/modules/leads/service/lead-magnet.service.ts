import { Types } from 'mongoose';
import { CtaActionType } from '@core/constants/leads';
import { EntityStatus } from '@core/schemas/base.schema';
import { ICtaAction, IDisplayRules, IImageAsset } from '@core/schemas/lead-gen.schema';
import { BadRequestError, NotFoundError } from '@core/errors';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import { ILeadMagnet, LeadMagnet } from '../model/lead-magnet.model';
import {
  DisplayContext,
  matchesDisplayRules,
  sortByPriorityDesc,
} from '../utils/display-rules';

export type CreateLeadMagnetDto = {
  title: string;
  description?: string;
  value?: string;
  benefits?: string[];
  icon?: string;
  image?: IImageAsset | null;
  ctaAction?: Partial<ICtaAction> & {
    formId?: string | Types.ObjectId | null;
    offerId?: string | Types.ObjectId | null;
    magnetId?: string | Types.ObjectId | null;
    popupId?: string | Types.ObjectId | null;
  };
  landingUrl?: string;
  formId?: string | null;
  displayRules?: Partial<IDisplayRules>;
  campaignId?: string | null;
  status?: EntityStatus;
};

export type UpdateLeadMagnetDto = Partial<CreateLeadMagnetDto>;

export type LeadMagnetResponse = {
  id: string;
  title: string;
  description?: string;
  value?: string;
  benefits: string[];
  icon?: string;
  image?: IImageAsset | null;
  ctaAction: ICtaAction;
  landingUrl?: string;
  formId?: string | null;
  displayRules: IDisplayRules;
  campaignId?: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

export type ListLeadMagnetsQuery = {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  status?: EntityStatus;
  includeTrash?: boolean;
  trashOnly?: boolean;
};

function toObjectId(value: string | Types.ObjectId | null | undefined): Types.ObjectId | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (value instanceof Types.ObjectId) return value;
  return new Types.ObjectId(String(value));
}

function mapCta(cta: ICtaAction | undefined): ICtaAction {
  return {
    type: cta?.type ?? CtaActionType.FORM,
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

function mapMagnet(doc: ILeadMagnet): LeadMagnetResponse {
  return {
    id: doc.id,
    title: doc.title,
    description: doc.description,
    value: doc.value,
    benefits: doc.benefits ?? [],
    icon: doc.icon,
    image: doc.image ?? null,
    ctaAction: mapCta(doc.ctaAction),
    landingUrl: doc.landingUrl,
    formId: doc.formId?.toString() ?? null,
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

export class LeadMagnetService {
  async list(
    query: ListLeadMagnetsQuery,
  ): Promise<{ magnets: LeadMagnetResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);
    const filter: Record<string, unknown> = {
      ...buildSearchFilter(query.search, ['title', 'description', 'value']),
    };

    if (query.trashOnly) filter.isDeleted = true;
    else if (!query.includeTrash) filter.isDeleted = { $ne: true };
    if (query.status) filter.status = query.status;

    const findQuery = LeadMagnet.find(filter).sort(sort).skip(skip).limit(limit);
    const countQuery = LeadMagnet.countDocuments(filter);

    if (query.trashOnly || query.includeTrash) {
      findQuery.setOptions({ includeDeleted: true });
      countQuery.setOptions({ includeDeleted: true });
    }

    const [docs, total] = await Promise.all([findQuery.exec(), countQuery.exec()]);
    return {
      magnets: docs.map(mapMagnet),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<LeadMagnetResponse> {
    const doc = await LeadMagnet.findById(id);
    if (!doc) throw new NotFoundError('Lead magnet not found');
    return mapMagnet(doc);
  }

  async listPublishedForContext(
    context: DisplayContext,
    limit = 5,
  ): Promise<LeadMagnetResponse[]> {
    const docs = await LeadMagnet.find({
      status: EntityStatus.PUBLISHED,
      isDeleted: { $ne: true },
    })
      .sort({ 'displayRules.priority': -1 })
      .limit(100)
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
      .map((item) => mapMagnet(item.doc));
  }

  async create(dto: CreateLeadMagnetDto, userId: string): Promise<LeadMagnetResponse> {
    if (!dto.title?.trim()) throw new BadRequestError('Title is required');

    const formId = toObjectId(dto.formId ?? dto.ctaAction?.formId?.toString());

    const doc = await LeadMagnet.create({
      title: dto.title,
      description: dto.description,
      value: dto.value,
      benefits: dto.benefits ?? [],
      icon: dto.icon,
      image: dto.image ?? null,
      ctaAction: {
        type: dto.ctaAction?.type ?? CtaActionType.FORM,
        label: dto.ctaAction?.label,
        url: dto.ctaAction?.url,
        formId,
        offerId: toObjectId(dto.ctaAction?.offerId?.toString()),
        magnetId: toObjectId(dto.ctaAction?.magnetId?.toString()),
        popupId: toObjectId(dto.ctaAction?.popupId?.toString()),
        phone: dto.ctaAction?.phone,
        whatsappNumber: dto.ctaAction?.whatsappNumber,
      },
      landingUrl: dto.landingUrl,
      formId: formId ?? null,
      displayRules: dto.displayRules,
      campaignId: toObjectId(dto.campaignId),
      status: dto.status ?? EntityStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    return mapMagnet(doc);
  }

  async update(id: string, dto: UpdateLeadMagnetDto, userId: string): Promise<LeadMagnetResponse> {
    const doc = await LeadMagnet.findById(id);
    if (!doc) throw new NotFoundError('Lead magnet not found');

    if (dto.title !== undefined) doc.title = dto.title;
    if (dto.description !== undefined) doc.description = dto.description;
    if (dto.value !== undefined) doc.value = dto.value;
    if (dto.benefits !== undefined) doc.benefits = dto.benefits;
    if (dto.icon !== undefined) doc.icon = dto.icon;
    if (dto.image !== undefined) doc.image = dto.image;
    if (dto.landingUrl !== undefined) doc.landingUrl = dto.landingUrl;
    if (dto.formId !== undefined) doc.formId = toObjectId(dto.formId) ?? null;
    if (dto.displayRules !== undefined) {
      doc.displayRules = mergeDisplayRules(doc.displayRules, dto.displayRules);
    }
    if (dto.campaignId !== undefined) doc.campaignId = toObjectId(dto.campaignId) ?? null;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.ctaAction !== undefined) {
      doc.ctaAction = {
        type: dto.ctaAction.type ?? doc.ctaAction?.type ?? CtaActionType.FORM,
        label: dto.ctaAction.label ?? doc.ctaAction?.label,
        url: dto.ctaAction.url ?? doc.ctaAction?.url,
        formId:
          dto.ctaAction.formId !== undefined
            ? toObjectId(dto.ctaAction.formId) ?? null
            : doc.ctaAction?.formId,
        offerId:
          dto.ctaAction.offerId !== undefined
            ? toObjectId(dto.ctaAction.offerId) ?? null
            : doc.ctaAction?.offerId,
        magnetId:
          dto.ctaAction.magnetId !== undefined
            ? toObjectId(dto.ctaAction.magnetId) ?? null
            : doc.ctaAction?.magnetId,
        popupId:
          dto.ctaAction.popupId !== undefined
            ? toObjectId(dto.ctaAction.popupId) ?? null
            : doc.ctaAction?.popupId,
        phone: dto.ctaAction.phone ?? doc.ctaAction?.phone,
        whatsappNumber: dto.ctaAction.whatsappNumber ?? doc.ctaAction?.whatsappNumber,
      };
      if (dto.ctaAction.formId !== undefined && dto.formId === undefined) {
        doc.formId = toObjectId(dto.ctaAction.formId) ?? null;
      }
    }

    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapMagnet(doc);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const doc = await LeadMagnet.findById(id);
    if (!doc) throw new NotFoundError('Lead magnet not found');
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.status = EntityStatus.DELETED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
  }

  async restore(id: string, userId: string): Promise<LeadMagnetResponse> {
    const doc = await LeadMagnet.findById(id).setOptions({ includeDeleted: true });
    if (!doc) throw new NotFoundError('Lead magnet not found');
    doc.isDeleted = false;
    doc.deletedAt = undefined;
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapMagnet(doc);
  }

  async publish(id: string, userId: string): Promise<LeadMagnetResponse> {
    const doc = await LeadMagnet.findById(id);
    if (!doc) throw new NotFoundError('Lead magnet not found');
    doc.status = EntityStatus.PUBLISHED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapMagnet(doc);
  }

  async unpublish(id: string, userId: string): Promise<LeadMagnetResponse> {
    const doc = await LeadMagnet.findById(id);
    if (!doc) throw new NotFoundError('Lead magnet not found');
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapMagnet(doc);
  }
}

export const leadMagnetService = new LeadMagnetService();
