import { UpdateQuery } from 'mongoose';
import { BadRequestError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import { SoftListRepository } from '@modules/shared/soft-list/soft-list.repository';
import { ITestimonial, Testimonial } from '../model/testimonial.model';

export interface TestimonialResponse {
  id: string;
  name: string;
  role?: string;
  company?: string;
  content: string;
  avatar?: string;
  rating: number;
  sortOrder: number;
  featured: boolean;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestimonialDto {
  name: string;
  role?: string;
  company?: string;
  content: string;
  avatar?: string;
  rating?: number;
  sortOrder?: number;
  featured?: boolean;
  isActive?: boolean;
}

export type UpdateTestimonialDto = Partial<CreateTestimonialDto>;

export interface ListTestimonialQuery extends PaginationQuery {
  search?: string;
  isActive?: boolean;
  includeTrash?: boolean;
  trashOnly?: boolean;
  featured?: boolean;
}

const repository = new SoftListRepository<ITestimonial>(Testimonial);
const SEARCH_FIELDS = ['name', 'role', 'company', 'content'];

export class TestimonialService {
  private toResponse(item: ITestimonial): TestimonialResponse {
    return {
      id: item.id,
      name: item.name,
      role: item.role,
      company: item.company,
      content: item.content,
      avatar: item.avatar,
      rating: item.rating,
      sortOrder: item.sortOrder ?? 0,
      featured: item.featured,
      isActive: item.isActive,
      isDeleted: item.isDeleted,
      deletedAt: item.deletedAt?.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private async getOrThrow(id: string, includeDeleted = false): Promise<ITestimonial> {
    const item = await repository.findById(id, includeDeleted);
    if (!item) throw new NotFoundError('Testimonial');
    return item;
  }

  private mapFields(dto: CreateTestimonialDto | UpdateTestimonialDto): Record<string, unknown> {
    return {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.role !== undefined && { role: dto.role || undefined }),
      ...(dto.company !== undefined && { company: dto.company || undefined }),
      ...(dto.content !== undefined && { content: dto.content }),
      ...(dto.avatar !== undefined && { avatar: dto.avatar || undefined }),
      ...(dto.rating !== undefined && { rating: dto.rating }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.featured !== undefined && { featured: dto.featured }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };
  }

  async list(
    query: ListTestimonialQuery,
  ): Promise<{ items: TestimonialResponse[]; meta: PaginationMeta }> {
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
      extraFilter: query.featured === undefined ? undefined : { featured: query.featured },
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

  async listPublic(
    query: ListTestimonialQuery,
  ): Promise<{ items: TestimonialResponse[]; meta: PaginationMeta }> {
    return this.list({
      ...query,
      isActive: true,
      includeTrash: false,
      trashOnly: false,
      limit: query.limit ?? 50,
      sort: query.sort ?? 'sortOrder',
      order: query.order ?? 'asc',
    });
  }

  async getById(id: string): Promise<TestimonialResponse> {
    return this.toResponse(await this.getOrThrow(id));
  }

  async create(dto: CreateTestimonialDto, actorId: string): Promise<TestimonialResponse> {
    const item = await repository.create({
      name: dto.name,
      content: dto.content,
      role: dto.role || undefined,
      company: dto.company || undefined,
      avatar: dto.avatar || undefined,
      rating: dto.rating ?? 5,
      sortOrder: dto.sortOrder ?? 0,
      featured: dto.featured ?? true,
      isActive: dto.isActive ?? true,
      createdBy: actorId,
      updatedBy: actorId,
    } as unknown as Partial<ITestimonial>);

    loggers.admin.info('Testimonial created', { id: item.id, actorId });
    return this.toResponse(item);
  }

  async update(id: string, dto: UpdateTestimonialDto, actorId: string): Promise<TestimonialResponse> {
    const existing = await this.getOrThrow(id);
    if (existing.isDeleted) throw new BadRequestError('Cannot update testimonial in trash');

    const updated = await repository.updateById(id, {
      ...this.mapFields(dto),
      updatedBy: actorId,
    } as UpdateQuery<ITestimonial>);

    if (!updated) throw new NotFoundError('Testimonial');
    loggers.admin.info('Testimonial updated', { id, actorId });
    return this.toResponse(updated);
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    const item = await this.getOrThrow(id);
    if (item.isDeleted) throw new BadRequestError('Testimonial is already in trash');
    await repository.softDeleteById(id, actorId);
    loggers.admin.info('Testimonial moved to trash', { id, actorId });
  }

  async restore(id: string, actorId: string): Promise<TestimonialResponse> {
    const item = await this.getOrThrow(id, true);
    if (!item.isDeleted) throw new BadRequestError('Testimonial is not in trash');
    const restored = await repository.restoreById(id, actorId);
    if (!restored) throw new NotFoundError('Testimonial');
    loggers.admin.info('Testimonial restored', { id, actorId });
    return this.toResponse(restored);
  }

  async permanentDelete(id: string, actorId: string): Promise<void> {
    await this.getOrThrow(id, true);
    await repository.permanentDeleteById(id);
    loggers.admin.info('Testimonial permanently deleted', { id, actorId });
  }
}

export const testimonialService = new TestimonialService();
