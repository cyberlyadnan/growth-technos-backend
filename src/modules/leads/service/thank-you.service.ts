import { Types } from 'mongoose';
import { CtaActionType, ThankYouPageType } from '@core/constants/leads';
import { EntityStatus } from '@core/schemas/base.schema';
import { ICtaAction, IResourceLink } from '@core/schemas/lead-gen.schema';
import { BadRequestError, NotFoundError } from '@core/errors';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import { ensureUniqueSlug, slugify } from '@core/utils/slug';
import { IThankYouNextStep, IThankYouPage, ThankYouPage } from '../model/thank-you-page.model';
import { ISuccessMessage, SuccessMessage } from '../model/success-message.model';
import {
  buildCtaAction,
  mapCtaAction,
  patchCtaAction,
  type CtaActionInput,
} from '../utils/cta-widget.helpers';

export type ThankYouPageResponse = {
  id: string;
  slug: string;
  type: ThankYouPageType;
  headline: string;
  body?: string;
  nextSteps: IThankYouNextStep[];
  timelineText?: string;
  downloadLinks: IResourceLink[];
  relatedResources: IResourceLink[];
  calendarEmbedUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  indexable: boolean;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

export type SuccessMessageResponse = {
  id: string;
  name: string;
  headline: string;
  body?: string;
  secondaryCta?: ICtaAction | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

type ListQuery = {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  status?: EntityStatus;
  type?: ThankYouPageType;
  includeTrash?: boolean;
  trashOnly?: boolean;
};

type CreateThankYouDto = {
  slug?: string;
  type?: ThankYouPageType;
  headline: string;
  body?: string;
  nextSteps?: Array<{ title: string; description?: string; order?: number }>;
  timelineText?: string;
  downloadLinks?: IResourceLink[];
  relatedResources?: IResourceLink[];
  calendarEmbedUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  indexable?: boolean;
  status?: EntityStatus;
};

type CreateSuccessDto = {
  name: string;
  headline: string;
  body?: string;
  secondaryCta?: CtaActionInput | null;
  status?: EntityStatus;
};

function mapThankYou(doc: IThankYouPage): ThankYouPageResponse {
  return {
    id: doc.id,
    slug: doc.slug,
    type: doc.type,
    headline: doc.headline,
    body: doc.body,
    nextSteps: [...(doc.nextSteps ?? [])].sort((a, b) => a.order - b.order),
    timelineText: doc.timelineText,
    downloadLinks: doc.downloadLinks ?? [],
    relatedResources: doc.relatedResources ?? [],
    calendarEmbedUrl: doc.calendarEmbedUrl,
    metaTitle: doc.metaTitle,
    metaDescription: doc.metaDescription,
    indexable: doc.indexable ?? false,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function mapSuccess(doc: ISuccessMessage): SuccessMessageResponse {
  return {
    id: doc.id,
    name: doc.name,
    headline: doc.headline,
    body: doc.body,
    secondaryCta: doc.secondaryCta ? mapCtaAction(doc.secondaryCta) : null,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export class ThankYouPageService {
  async list(query: ListQuery): Promise<{ pages: ThankYouPageResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);
    const filter: Record<string, unknown> = {
      ...buildSearchFilter(query.search, ['slug', 'headline', 'body', 'metaTitle']),
    };
    if (query.trashOnly) filter.isDeleted = true;
    else if (!query.includeTrash) filter.isDeleted = { $ne: true };
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;

    const findQuery = ThankYouPage.find(filter).sort(sort).skip(skip).limit(limit);
    const countQuery = ThankYouPage.countDocuments(filter);
    if (query.trashOnly || query.includeTrash) {
      findQuery.setOptions({ includeDeleted: true });
      countQuery.setOptions({ includeDeleted: true });
    }

    const [docs, total] = await Promise.all([findQuery.exec(), countQuery.exec()]);
    return { pages: docs.map(mapThankYou), meta: buildPaginationMeta(total, page, limit) };
  }

  async getById(id: string): Promise<ThankYouPageResponse> {
    const doc = await ThankYouPage.findById(id);
    if (!doc) throw new NotFoundError('Thank you page not found');
    return mapThankYou(doc);
  }

  async getPublishedBySlug(slug: string): Promise<ThankYouPageResponse> {
    const doc = await ThankYouPage.findOne({
      slug: slug.toLowerCase(),
      status: EntityStatus.PUBLISHED,
      isDeleted: { $ne: true },
    });
    if (!doc) throw new NotFoundError('Thank you page not found');
    return mapThankYou(doc);
  }

  async create(dto: CreateThankYouDto, userId: string): Promise<ThankYouPageResponse> {
    if (!dto.headline?.trim()) throw new BadRequestError('Headline is required');
    const baseSlug = dto.slug || slugify(dto.headline);
    const slug = await ensureUniqueSlug(baseSlug, async (candidate) => {
      const existing = await ThankYouPage.findOne({ slug: candidate, isDeleted: { $ne: true } });
      return Boolean(existing);
    });

    const doc = await ThankYouPage.create({
      slug,
      type: dto.type ?? ThankYouPageType.GENERIC,
      headline: dto.headline,
      body: dto.body,
      nextSteps: (dto.nextSteps ?? []).map((step, index) => ({
        title: step.title,
        description: step.description,
        order: step.order ?? index,
      })),
      timelineText: dto.timelineText,
      downloadLinks: dto.downloadLinks ?? [],
      relatedResources: dto.relatedResources ?? [],
      calendarEmbedUrl: dto.calendarEmbedUrl || undefined,
      metaTitle: dto.metaTitle || dto.headline.slice(0, 70),
      metaDescription: dto.metaDescription,
      indexable: dto.indexable ?? false,
      status: dto.status ?? EntityStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    return mapThankYou(doc);
  }

  async update(id: string, dto: Partial<CreateThankYouDto>, userId: string): Promise<ThankYouPageResponse> {
    const doc = await ThankYouPage.findById(id);
    if (!doc) throw new NotFoundError('Thank you page not found');

    if (dto.headline !== undefined) doc.headline = dto.headline;
    if (dto.type !== undefined) doc.type = dto.type;
    if (dto.body !== undefined) doc.body = dto.body;
    if (dto.timelineText !== undefined) doc.timelineText = dto.timelineText;
    if (dto.downloadLinks !== undefined) doc.downloadLinks = dto.downloadLinks;
    if (dto.relatedResources !== undefined) doc.relatedResources = dto.relatedResources;
    if (dto.calendarEmbedUrl !== undefined) doc.calendarEmbedUrl = dto.calendarEmbedUrl || undefined;
    if (dto.metaTitle !== undefined) doc.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined) doc.metaDescription = dto.metaDescription;
    if (dto.indexable !== undefined) doc.indexable = dto.indexable;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.nextSteps !== undefined) {
      doc.nextSteps = dto.nextSteps.map((step, index) => ({
        title: step.title,
        description: step.description,
        order: step.order ?? index,
      }));
    }
    if (dto.slug && dto.slug !== doc.slug) {
      doc.slug = await ensureUniqueSlug(dto.slug, async (candidate) => {
        const existing = await ThankYouPage.findOne({
          slug: candidate,
          isDeleted: { $ne: true },
          _id: { $ne: doc._id },
        });
        return Boolean(existing);
      });
    }

    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapThankYou(doc);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const doc = await ThankYouPage.findById(id);
    if (!doc) throw new NotFoundError('Thank you page not found');
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.status = EntityStatus.DELETED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
  }

  async restore(id: string, userId: string): Promise<ThankYouPageResponse> {
    const doc = await ThankYouPage.findById(id).setOptions({ includeDeleted: true });
    if (!doc) throw new NotFoundError('Thank you page not found');
    doc.isDeleted = false;
    doc.deletedAt = undefined;
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapThankYou(doc);
  }

  async publish(id: string, userId: string): Promise<ThankYouPageResponse> {
    const doc = await ThankYouPage.findById(id);
    if (!doc) throw new NotFoundError('Thank you page not found');
    doc.status = EntityStatus.PUBLISHED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapThankYou(doc);
  }

  async unpublish(id: string, userId: string): Promise<ThankYouPageResponse> {
    const doc = await ThankYouPage.findById(id);
    if (!doc) throw new NotFoundError('Thank you page not found');
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapThankYou(doc);
  }
}

export class SuccessMessageService {
  async list(query: ListQuery): Promise<{ messages: SuccessMessageResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);
    const filter: Record<string, unknown> = {
      ...buildSearchFilter(query.search, ['name', 'headline', 'body']),
    };
    if (query.trashOnly) filter.isDeleted = true;
    else if (!query.includeTrash) filter.isDeleted = { $ne: true };
    if (query.status) filter.status = query.status;

    const findQuery = SuccessMessage.find(filter).sort(sort).skip(skip).limit(limit);
    const countQuery = SuccessMessage.countDocuments(filter);
    if (query.trashOnly || query.includeTrash) {
      findQuery.setOptions({ includeDeleted: true });
      countQuery.setOptions({ includeDeleted: true });
    }

    const [docs, total] = await Promise.all([findQuery.exec(), countQuery.exec()]);
    return { messages: docs.map(mapSuccess), meta: buildPaginationMeta(total, page, limit) };
  }

  async getById(id: string): Promise<SuccessMessageResponse> {
    const doc = await SuccessMessage.findById(id);
    if (!doc) throw new NotFoundError('Success message not found');
    return mapSuccess(doc);
  }

  async create(dto: CreateSuccessDto, userId: string): Promise<SuccessMessageResponse> {
    if (!dto.name?.trim() || !dto.headline?.trim()) {
      throw new BadRequestError('Name and headline are required');
    }
    const doc = await SuccessMessage.create({
      name: dto.name,
      headline: dto.headline,
      body: dto.body,
      secondaryCta:
        dto.secondaryCta === null
          ? undefined
          : dto.secondaryCta
            ? buildCtaAction(dto.secondaryCta, CtaActionType.LINK)
            : undefined,
      status: dto.status ?? EntityStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });
    return mapSuccess(doc);
  }

  async update(id: string, dto: Partial<CreateSuccessDto>, userId: string): Promise<SuccessMessageResponse> {
    const doc = await SuccessMessage.findById(id);
    if (!doc) throw new NotFoundError('Success message not found');
    if (dto.name !== undefined) doc.name = dto.name;
    if (dto.headline !== undefined) doc.headline = dto.headline;
    if (dto.body !== undefined) doc.body = dto.body;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.secondaryCta !== undefined) {
      doc.secondaryCta =
        dto.secondaryCta === null
          ? undefined
          : patchCtaAction(doc.secondaryCta ?? undefined, dto.secondaryCta, CtaActionType.LINK);
    }
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapSuccess(doc);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const doc = await SuccessMessage.findById(id);
    if (!doc) throw new NotFoundError('Success message not found');
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.status = EntityStatus.DELETED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
  }

  async restore(id: string, userId: string): Promise<SuccessMessageResponse> {
    const doc = await SuccessMessage.findById(id).setOptions({ includeDeleted: true });
    if (!doc) throw new NotFoundError('Success message not found');
    doc.isDeleted = false;
    doc.deletedAt = undefined;
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapSuccess(doc);
  }

  async publish(id: string, userId: string): Promise<SuccessMessageResponse> {
    const doc = await SuccessMessage.findById(id);
    if (!doc) throw new NotFoundError('Success message not found');
    doc.status = EntityStatus.PUBLISHED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapSuccess(doc);
  }

  async unpublish(id: string, userId: string): Promise<SuccessMessageResponse> {
    const doc = await SuccessMessage.findById(id);
    if (!doc) throw new NotFoundError('Success message not found');
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapSuccess(doc);
  }
}

export const thankYouPageService = new ThankYouPageService();
export const successMessageService = new SuccessMessageService();
