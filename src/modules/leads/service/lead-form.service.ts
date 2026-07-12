import { Types } from 'mongoose';
import { FormFieldType } from '@core/constants/leads';
import { EntityStatus } from '@core/schemas/base.schema';
import { BadRequestError, NotFoundError } from '@core/errors';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import { ensureUniqueSlug, slugify } from '@core/utils/slug';
import { ILeadForm, LeadForm } from '../model/lead-form.model';
import { SuccessMessage } from '../model/success-message.model';
import {
  CreateLeadFormDto,
  LeadFormResponse,
  ListLeadFormsQuery,
  PublicLeadFormResponse,
  UpdateLeadFormDto,
} from '../types/lead.types';

function toObjectId(value: string | null | undefined): Types.ObjectId | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return new Types.ObjectId(value);
}

function mapForm(doc: ILeadForm): LeadFormResponse {
  return {
    id: doc.id,
    name: doc.name,
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    fields: doc.fields ?? [],
    microcopy: doc.microcopy ?? {},
    successMessageId: doc.successMessageId?.toString() ?? null,
    thankYouPageId: doc.thankYouPageId?.toString() ?? null,
    redirectRules: doc.redirectRules ?? { mode: 'none' },
    honeypotEnabled: doc.honeypotEnabled,
    displayRules: doc.displayRules,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function mapPublicForm(doc: ILeadForm): PublicLeadFormResponse {
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    fields: (doc.fields ?? []).filter((field) => field.type !== FormFieldType.HIDDEN),
    microcopy: doc.microcopy ?? {},
    honeypotEnabled: doc.honeypotEnabled,
    redirectRules: doc.redirectRules ?? { mode: 'none' },
  };
}

export class LeadFormService {
  async list(query: ListLeadFormsQuery): Promise<{ forms: LeadFormResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);
    const filter: Record<string, unknown> = {
      ...buildSearchFilter(query.search, ['name', 'slug', 'title', 'description']),
    };

    if (query.trashOnly) {
      filter.isDeleted = true;
    } else if (!query.includeTrash) {
      filter.isDeleted = { $ne: true };
    }

    if (query.status) {
      filter.status = query.status;
    }

    const findQuery = LeadForm.find(filter).sort(sort).skip(skip).limit(limit);
    const countQuery = LeadForm.countDocuments(filter);

    if (query.trashOnly || query.includeTrash) {
      findQuery.setOptions({ includeDeleted: true });
      countQuery.setOptions({ includeDeleted: true });
    }

    const [docs, total] = await Promise.all([findQuery.exec(), countQuery.exec()]);

    return {
      forms: docs.map(mapForm),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<LeadFormResponse> {
    const doc = await LeadForm.findById(id);
    if (!doc) throw new NotFoundError('Lead form not found');
    return mapForm(doc);
  }

  async getPublishedBySlug(slug: string): Promise<PublicLeadFormResponse> {
    const doc = await LeadForm.findOne({
      slug: slug.toLowerCase(),
      status: EntityStatus.PUBLISHED,
      isDeleted: { $ne: true },
    });
    if (!doc) throw new NotFoundError('Lead form not found');
    return mapPublicForm(doc);
  }

  async getEntityBySlugOrId(slugOrId: { formSlug?: string; formId?: string }): Promise<ILeadForm> {
    if (slugOrId.formId) {
      const byId = await LeadForm.findOne({
        _id: slugOrId.formId,
        status: EntityStatus.PUBLISHED,
        isDeleted: { $ne: true },
      });
      if (!byId) throw new NotFoundError('Lead form not found');
      return byId;
    }

    if (slugOrId.formSlug) {
      const bySlug = await LeadForm.findOne({
        slug: slugOrId.formSlug.toLowerCase(),
        status: EntityStatus.PUBLISHED,
        isDeleted: { $ne: true },
      });
      if (!bySlug) throw new NotFoundError('Lead form not found');
      return bySlug;
    }

    throw new BadRequestError('formSlug or formId is required');
  }

  async create(dto: CreateLeadFormDto, userId: string): Promise<LeadFormResponse> {
    const baseSlug = dto.slug || slugify(dto.name);
    const slug = await ensureUniqueSlug(baseSlug, async (candidate) => {
      const existing = await LeadForm.findOne({ slug: candidate, isDeleted: { $ne: true } });
      return Boolean(existing);
    });

    if (dto.successMessageId) {
      const msg = await SuccessMessage.findById(dto.successMessageId);
      if (!msg) throw new BadRequestError('Success message not found');
    }

    const doc = await LeadForm.create({
      name: dto.name,
      slug,
      title: dto.title,
      description: dto.description,
      fields: (dto.fields ?? []).map((field, index) => ({
        ...field,
        required: field.required ?? false,
        options: field.options ?? [],
        order: field.order ?? index,
      })),
      microcopy: dto.microcopy ?? {},
      successMessageId: toObjectId(dto.successMessageId),
      thankYouPageId: toObjectId(dto.thankYouPageId),
      redirectRules: dto.redirectRules ?? { mode: 'none' },
      honeypotEnabled: dto.honeypotEnabled ?? true,
      displayRules: dto.displayRules,
      status: dto.status ?? EntityStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    return mapForm(doc);
  }

  async update(id: string, dto: UpdateLeadFormDto, userId: string): Promise<LeadFormResponse> {
    const doc = await LeadForm.findById(id);
    if (!doc) throw new NotFoundError('Lead form not found');

    if (dto.name !== undefined) doc.name = dto.name;
    if (dto.title !== undefined) doc.title = dto.title;
    if (dto.description !== undefined) doc.description = dto.description;
    if (dto.fields !== undefined) {
      doc.fields = dto.fields.map((field, index) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        required: field.required ?? false,
        options: field.options ?? [],
        order: field.order ?? index,
        placeholder: field.placeholder,
        helpText: field.helpText,
        step: field.step,
        defaultValue: field.defaultValue,
      }));
    }
    if (dto.microcopy !== undefined) doc.microcopy = dto.microcopy;
    if (dto.successMessageId !== undefined) {
      doc.successMessageId = toObjectId(dto.successMessageId) ?? null;
    }
    if (dto.thankYouPageId !== undefined) {
      doc.thankYouPageId = toObjectId(dto.thankYouPageId) ?? null;
    }
    if (dto.redirectRules !== undefined) {
      doc.redirectRules = {
        mode: dto.redirectRules.mode ?? doc.redirectRules?.mode ?? 'none',
        thankYouSlug: dto.redirectRules.thankYouSlug,
        path: dto.redirectRules.path,
        openInNewTab: dto.redirectRules.openInNewTab,
      };
    }
    if (dto.honeypotEnabled !== undefined) doc.honeypotEnabled = dto.honeypotEnabled;
    if (dto.displayRules !== undefined) {
      doc.displayRules = {
        ...doc.displayRules,
        ...dto.displayRules,
        industries: dto.displayRules.industries ?? doc.displayRules.industries,
        services: dto.displayRules.services ?? doc.displayRules.services,
        pagePaths: dto.displayRules.pagePaths ?? doc.displayRules.pagePaths,
        pageTypes: dto.displayRules.pageTypes ?? doc.displayRules.pageTypes,
        devices: dto.displayRules.devices ?? doc.displayRules.devices,
        excludePaths: dto.displayRules.excludePaths ?? doc.displayRules.excludePaths,
        priority: dto.displayRules.priority ?? doc.displayRules.priority,
      };
    }
    if (dto.status !== undefined) doc.status = dto.status;

    if (dto.slug && dto.slug !== doc.slug) {
      doc.slug = await ensureUniqueSlug(dto.slug, async (candidate) => {
        const existing = await LeadForm.findOne({
          slug: candidate,
          isDeleted: { $ne: true },
          _id: { $ne: doc._id },
        });
        return Boolean(existing);
      });
    }

    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapForm(doc);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const doc = await LeadForm.findById(id);
    if (!doc) throw new NotFoundError('Lead form not found');
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.status = EntityStatus.DELETED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
  }

  async restore(id: string, userId: string): Promise<LeadFormResponse> {
    const doc = await LeadForm.findById(id).setOptions({ includeDeleted: true });
    if (!doc) throw new NotFoundError('Lead form not found');
    doc.isDeleted = false;
    doc.deletedAt = undefined;
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapForm(doc);
  }

  async publish(id: string, userId: string): Promise<LeadFormResponse> {
    const doc = await LeadForm.findById(id);
    if (!doc) throw new NotFoundError('Lead form not found');
    if (!doc.fields?.length) {
      throw new BadRequestError('Cannot publish a form without fields');
    }
    doc.status = EntityStatus.PUBLISHED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapForm(doc);
  }

  async unpublish(id: string, userId: string): Promise<LeadFormResponse> {
    const doc = await LeadForm.findById(id);
    if (!doc) throw new NotFoundError('Lead form not found');
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapForm(doc);
  }
}

export const leadFormService = new LeadFormService();
