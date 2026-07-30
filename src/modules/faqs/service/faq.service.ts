import { UpdateQuery } from 'mongoose';
import { BadRequestError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import { SoftListRepository } from '@modules/shared/soft-list/soft-list.repository';
import { Faq, IFaq } from '../model/faq.model';

export interface FaqResponse {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  featured: boolean;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFaqDto {
  question: string;
  answer: string;
  category?: string;
  sortOrder?: number;
  featured?: boolean;
  isActive?: boolean;
}

export type UpdateFaqDto = Partial<CreateFaqDto>;

export interface ListFaqQuery extends PaginationQuery {
  search?: string;
  isActive?: boolean;
  includeTrash?: boolean;
  trashOnly?: boolean;
  featured?: boolean;
  category?: string;
}

const repository = new SoftListRepository<IFaq>(Faq);
const SEARCH_FIELDS = ['question', 'answer', 'category'];

export class FaqService {
  private toResponse(item: IFaq): FaqResponse {
    return {
      id: item.id,
      question: item.question,
      answer: item.answer,
      category: item.category,
      sortOrder: item.sortOrder ?? 0,
      featured: item.featured,
      isActive: item.isActive,
      isDeleted: item.isDeleted,
      deletedAt: item.deletedAt?.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private async getOrThrow(id: string, includeDeleted = false): Promise<IFaq> {
    const item = await repository.findById(id, includeDeleted);
    if (!item) throw new NotFoundError('FAQ');
    return item;
  }

  private mapFields(dto: CreateFaqDto | UpdateFaqDto): Record<string, unknown> {
    return {
      ...(dto.question !== undefined && { question: dto.question }),
      ...(dto.answer !== undefined && { answer: dto.answer }),
      ...(dto.category !== undefined && { category: dto.category || 'General' }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.featured !== undefined && { featured: dto.featured }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };
  }

  async list(query: ListFaqQuery): Promise<{ items: FaqResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'sortOrder',
      order: query.order ?? 'asc',
    });

    const filterOptions = {
      skip,
      limit,
      sort,
      search: query.search,
      isActive: query.isActive,
      includeTrash: query.includeTrash,
      trashOnly: query.trashOnly,
      extraFilter: {
        ...(query.featured === undefined ? {} : { featured: query.featured }),
        ...(query.category?.trim() ? { category: query.category.trim() } : {}),
      },
    };

    const [items, total] = await Promise.all([
      repository.findMany(filterOptions, SEARCH_FIELDS),
      repository.count(filterOptions, SEARCH_FIELDS),
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async listPublic(query: ListFaqQuery): Promise<{ items: FaqResponse[]; meta: PaginationMeta }> {
    return this.list({
      ...query,
      isActive: true,
      includeTrash: false,
      trashOnly: false,
      limit: query.limit ?? 100,
      sort: query.sort ?? 'sortOrder',
      order: query.order ?? 'asc',
    });
  }

  async getById(id: string): Promise<FaqResponse> {
    return this.toResponse(await this.getOrThrow(id));
  }

  async create(dto: CreateFaqDto, actorId: string): Promise<FaqResponse> {
    const item = await repository.create({
      question: dto.question,
      answer: dto.answer,
      category: dto.category?.trim() || 'General',
      sortOrder: dto.sortOrder ?? 0,
      featured: dto.featured ?? false,
      isActive: dto.isActive ?? true,
      createdBy: actorId,
      updatedBy: actorId,
    } as unknown as Partial<IFaq>);

    loggers.admin.info('FAQ created', { id: item.id, actorId });
    return this.toResponse(item);
  }

  async update(id: string, dto: UpdateFaqDto, actorId: string): Promise<FaqResponse> {
    const existing = await this.getOrThrow(id);
    if (existing.isDeleted) throw new BadRequestError('Cannot update FAQ in trash');

    const updated = await repository.updateById(id, {
      ...this.mapFields(dto),
      updatedBy: actorId,
    } as UpdateQuery<IFaq>);

    if (!updated) throw new NotFoundError('FAQ');
    loggers.admin.info('FAQ updated', { id, actorId });
    return this.toResponse(updated);
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    const item = await this.getOrThrow(id);
    if (item.isDeleted) throw new BadRequestError('FAQ is already in trash');
    await repository.softDeleteById(id, actorId);
    loggers.admin.info('FAQ moved to trash', { id, actorId });
  }

  async restore(id: string, actorId: string): Promise<FaqResponse> {
    const item = await this.getOrThrow(id, true);
    if (!item.isDeleted) throw new BadRequestError('FAQ is not in trash');
    const restored = await repository.restoreById(id, actorId);
    if (!restored) throw new NotFoundError('FAQ');
    loggers.admin.info('FAQ restored', { id, actorId });
    return this.toResponse(restored);
  }

  async permanentDelete(id: string, actorId: string): Promise<void> {
    await this.getOrThrow(id, true);
    await repository.permanentDeleteById(id);
    loggers.admin.info('FAQ permanently deleted', { id, actorId });
  }
}

export const faqService = new FaqService();
