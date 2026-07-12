import { UpdateQuery } from 'mongoose';
import { BadRequestError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import { ensureUniqueSlug, slugify } from '@core/utils/slug';
import { TaxonomyDocument, TaxonomyRepository } from './taxonomy.repository';

export interface TaxonomyResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListTaxonomyQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  isActive?: boolean;
  includeTrash?: boolean;
  trashOnly?: boolean;
}

export interface CreateTaxonomyDto {
  name: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
}

export type UpdateTaxonomyDto = Partial<CreateTaxonomyDto>;

export class TaxonomyService<T extends TaxonomyDocument> {
  constructor(
    private readonly repository: TaxonomyRepository<T>,
    private readonly entityLabel: string,
    private readonly searchFields: string[],
    private readonly mapExtraFields?: (
      dto: CreateTaxonomyDto | UpdateTaxonomyDto,
    ) => Record<string, unknown>,
    private readonly validateReferences?: (
      dto: CreateTaxonomyDto | UpdateTaxonomyDto,
      id?: string,
    ) => Promise<void>,
  ) {}

  private toResponse(entity: T): TaxonomyResponse {
    const response: TaxonomyResponse = {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      isActive: entity.isActive,
      isDeleted: entity.isDeleted,
      deletedAt: entity.deletedAt?.toISOString(),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };

    if ('icon' in entity && typeof entity.icon === 'string' && entity.icon) {
      response.icon = entity.icon;
    }

    return response;
  }

  private async getOrThrow(id: string, includeDeleted = false): Promise<T> {
    const entity = await this.repository.findById(id, includeDeleted);
    if (!entity) throw new NotFoundError(this.entityLabel);
    return entity;
  }

  private async resolveSlug(name: string, slug?: string, excludeId?: string): Promise<string> {
    const base = slugify(slug || name);
    return ensureUniqueSlug(base, async (candidate) =>
      this.repository.slugExists(candidate, excludeId),
    );
  }

  async list(
    query: ListTaxonomyQuery,
  ): Promise<{ items: TaxonomyResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);

    const [items, total] = await Promise.all([
      this.repository.findMany(
        {
          skip,
          limit,
          sort,
          search: query.search,
          isActive: query.isActive,
          includeTrash: query.includeTrash,
          trashOnly: query.trashOnly,
        },
        this.searchFields,
      ),
      this.repository.count(
        {
          search: query.search,
          isActive: query.isActive,
          includeTrash: query.includeTrash,
          trashOnly: query.trashOnly,
        },
        this.searchFields,
      ),
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async listPublic(
    query: ListTaxonomyQuery,
  ): Promise<{ items: TaxonomyResponse[]; meta: PaginationMeta }> {
    return this.list({
      ...query,
      isActive: true,
      includeTrash: false,
      trashOnly: false,
      limit: query.limit ?? 100,
    });
  }

  async getById(id: string): Promise<TaxonomyResponse> {
    const entity = await this.getOrThrow(id);
    return this.toResponse(entity);
  }

  async getPublicBySlug(slug: string): Promise<TaxonomyResponse> {
    const entity = await this.repository.findBySlug(slug.toLowerCase(), true);
    if (!entity || !entity.isActive || entity.isDeleted) {
      throw new NotFoundError(this.entityLabel);
    }
    return this.toResponse(entity);
  }

  async create(dto: CreateTaxonomyDto, actorId: string): Promise<TaxonomyResponse> {
    if (this.validateReferences) await this.validateReferences(dto);

    const slug = await this.resolveSlug(dto.name, dto.slug);
    const entity = await this.repository.create({
      name: dto.name,
      slug,
      description: dto.description || undefined,
      isActive: dto.isActive ?? true,
      createdBy: actorId,
      updatedBy: actorId,
      ...(this.mapExtraFields?.(dto) ?? {}),
    } as unknown as Partial<T>);

    loggers.admin.info(`${this.entityLabel} created`, { id: entity.id, actorId });
    return this.toResponse(entity);
  }

  async update(id: string, dto: UpdateTaxonomyDto, actorId: string): Promise<TaxonomyResponse> {
    const existing = await this.getOrThrow(id);
    if (existing.isDeleted) {
      throw new BadRequestError(`Cannot update ${this.entityLabel.toLowerCase()} in trash`);
    }

    if (this.validateReferences) await this.validateReferences(dto, id);

    const updateData: Record<string, unknown> = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description || undefined }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(this.mapExtraFields?.(dto) ?? {}),
      updatedBy: actorId,
    };

    if (dto.slug || dto.name) {
      updateData.slug = await this.resolveSlug(
        dto.name ?? existing.name,
        dto.slug ?? existing.slug,
        id,
      );
    }

    const updated = await this.repository.updateById(id, updateData as UpdateQuery<T>);
    if (!updated) throw new NotFoundError(this.entityLabel);

    loggers.admin.info(`${this.entityLabel} updated`, { id, actorId });
    return this.toResponse(updated);
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    const entity = await this.getOrThrow(id);
    if (entity.isDeleted) {
      throw new BadRequestError(`${this.entityLabel} is already in trash`);
    }

    await this.repository.softDeleteById(id, actorId);
    loggers.admin.info(`${this.entityLabel} moved to trash`, { id, actorId });
  }

  async restore(id: string, actorId: string): Promise<TaxonomyResponse> {
    const entity = await this.getOrThrow(id, true);
    if (!entity.isDeleted) {
      throw new BadRequestError(`${this.entityLabel} is not in trash`);
    }

    const restored = await this.repository.restoreById(id, actorId);
    if (!restored) throw new NotFoundError(this.entityLabel);

    loggers.admin.info(`${this.entityLabel} restored`, { id, actorId });
    return this.toResponse(restored);
  }

  async permanentDelete(id: string, actorId: string): Promise<void> {
    await this.getOrThrow(id, true);
    await this.repository.permanentDeleteById(id);
    loggers.admin.info(`${this.entityLabel} permanently deleted`, { id, actorId });
  }
}
