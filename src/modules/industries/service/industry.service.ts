import { UpdateQuery } from 'mongoose';
import { BadRequestError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import { calculateCmsSeoScore } from '@core/utils/cms-seo-score';
import { ensureUniqueSlug, slugify } from '@core/utils/slug';
import { revalidateIndustryContent } from '@core/revalidation/frontend-revalidation';
import { TaxonomyRepository } from '@modules/shared/taxonomy/taxonomy.repository';
import { ListTaxonomyQuery } from '@modules/shared/taxonomy/taxonomy.service';
import { IIndustry, Industry } from '../model/industry.model';

export interface IndustryResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  seoScore?: number;
  includeInSitemap: boolean;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IndustrySitemapEntry {
  slug: string;
  updatedAt: string;
}

export interface IndustryPublicFeedsResponse {
  sitemap: IndustrySitemapEntry[];
}

export interface CreateIndustryDto {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  includeInSitemap?: boolean;
}

export type UpdateIndustryDto = Partial<CreateIndustryDto>;

const industryRepository = new TaxonomyRepository<IIndustry>(Industry);

export class IndustryService {
  private toResponse(entity: IIndustry): IndustryResponse {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      icon: entity.icon,
      metaTitle: entity.metaTitle,
      metaDescription: entity.metaDescription,
      metaKeywords: entity.metaKeywords,
      canonicalUrl: entity.canonicalUrl,
      robotsIndex: entity.robotsIndex,
      robotsFollow: entity.robotsFollow,
      seoScore: entity.seoScore,
      includeInSitemap: entity.includeInSitemap,
      isActive: entity.isActive,
      isDeleted: entity.isDeleted,
      deletedAt: entity.deletedAt?.toISOString(),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private resolveSeoScore(dto: CreateIndustryDto | UpdateIndustryDto, existing?: IIndustry): number {
    return calculateCmsSeoScore({
      title: dto.name ?? existing?.name ?? '',
      slug: dto.slug ?? existing?.slug,
      shortDescription: dto.description ?? existing?.description,
      metaTitle: dto.metaTitle ?? existing?.metaTitle,
      metaDescription: dto.metaDescription ?? existing?.metaDescription,
      metaKeywords: dto.metaKeywords ?? existing?.metaKeywords,
      canonicalUrl: dto.canonicalUrl ?? existing?.canonicalUrl,
      robotsIndex: dto.robotsIndex ?? existing?.robotsIndex ?? true,
      includeInSitemap: dto.includeInSitemap ?? existing?.includeInSitemap ?? true,
    }).score;
  }

  private buildIndustryData(
    dto: CreateIndustryDto | UpdateIndustryDto,
    actorId: string,
    existing?: IIndustry,
  ): Record<string, unknown> {
    return {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description || undefined }),
      ...(dto.icon !== undefined && { icon: dto.icon || undefined }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle || undefined }),
      ...(dto.metaDescription !== undefined && {
        metaDescription: dto.metaDescription || undefined,
      }),
      ...(dto.metaKeywords !== undefined && { metaKeywords: dto.metaKeywords }),
      ...(dto.canonicalUrl !== undefined && { canonicalUrl: dto.canonicalUrl || undefined }),
      ...(dto.robotsIndex !== undefined && { robotsIndex: dto.robotsIndex }),
      ...(dto.robotsFollow !== undefined && { robotsFollow: dto.robotsFollow }),
      ...(dto.includeInSitemap !== undefined && { includeInSitemap: dto.includeInSitemap }),
      seoScore: this.resolveSeoScore(dto, existing),
      updatedBy: actorId,
    };
  }

  private async getOrThrow(id: string, includeDeleted = false): Promise<IIndustry> {
    const entity = await industryRepository.findById(id, includeDeleted);
    if (!entity) throw new NotFoundError('Industry');
    return entity;
  }

  private async resolveSlug(name: string, slug?: string, excludeId?: string): Promise<string> {
    const base = slugify(slug || name);
    return ensureUniqueSlug(base, async (candidate) =>
      industryRepository.slugExists(candidate, excludeId),
    );
  }

  async list(
    query: ListTaxonomyQuery,
  ): Promise<{ items: IndustryResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);

    const [items, total] = await Promise.all([
      industryRepository.findMany(
        {
          skip,
          limit,
          sort,
          search: query.search,
          isActive: query.isActive,
          includeTrash: query.includeTrash,
          trashOnly: query.trashOnly,
        },
        ['name', 'slug', 'description'],
      ),
      industryRepository.count(
        {
          search: query.search,
          isActive: query.isActive,
          includeTrash: query.includeTrash,
          trashOnly: query.trashOnly,
        },
        ['name', 'slug', 'description'],
      ),
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async listPublic(
    query: ListTaxonomyQuery,
  ): Promise<{ items: IndustryResponse[]; meta: PaginationMeta }> {
    return this.list({
      ...query,
      isActive: true,
      includeTrash: false,
      trashOnly: false,
      limit: query.limit ?? 100,
    });
  }

  async getById(id: string): Promise<IndustryResponse> {
    return this.toResponse(await this.getOrThrow(id));
  }

  async getPublicBySlug(slug: string): Promise<IndustryResponse> {
    const entity = await industryRepository.findBySlug(slug.toLowerCase(), true);
    if (!entity || !entity.isActive || entity.isDeleted) {
      throw new NotFoundError('Industry');
    }
    return this.toResponse(entity);
  }

  async getPublicFeeds(): Promise<IndustryPublicFeedsResponse> {
    const { items } = await this.listPublic({ limit: 100, sort: 'name', order: 'asc' });
    const sitemap: IndustrySitemapEntry[] = [];

    items.forEach((industry) => {
      if (industry.robotsIndex && industry.includeInSitemap) {
        sitemap.push({
          slug: industry.slug,
          updatedAt: industry.updatedAt,
        });
      }
    });

    return { sitemap };
  }

  async create(dto: CreateIndustryDto, actorId: string): Promise<IndustryResponse> {
    const slug = await this.resolveSlug(dto.name, dto.slug);
    const entity = await industryRepository.create({
      name: dto.name,
      slug,
      description: dto.description || undefined,
      icon: dto.icon || undefined,
      isActive: dto.isActive ?? true,
      metaKeywords: dto.metaKeywords ?? [],
      robotsIndex: dto.robotsIndex ?? true,
      robotsFollow: dto.robotsFollow ?? true,
      includeInSitemap: dto.includeInSitemap ?? true,
      createdBy: actorId,
      ...this.buildIndustryData(dto, actorId),
    } as unknown as Partial<IIndustry>);

    loggers.admin.info('Industry created', { id: entity.id, actorId });
    revalidateIndustryContent(entity.slug);
    return this.toResponse(entity);
  }

  async update(id: string, dto: UpdateIndustryDto, actorId: string): Promise<IndustryResponse> {
    const existing = await this.getOrThrow(id);
    if (existing.isDeleted) {
      throw new BadRequestError('Cannot update industry in trash');
    }

    const updateData = this.buildIndustryData(dto, actorId, existing) as UpdateQuery<IIndustry>;

    if (dto.slug || dto.name) {
      updateData.slug = await this.resolveSlug(
        dto.name ?? existing.name,
        dto.slug ?? existing.slug,
        id,
      );
    }

    const updated = await industryRepository.updateById(id, updateData);
    if (!updated) throw new NotFoundError('Industry');

    loggers.admin.info('Industry updated', { id, actorId });
    revalidateIndustryContent(updated.slug);
    return this.toResponse(updated);
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    const entity = await this.getOrThrow(id);
    if (entity.isDeleted) throw new BadRequestError('Industry is already in trash');

    await industryRepository.softDeleteById(id, actorId);
    loggers.admin.info('Industry moved to trash', { id, actorId });
    revalidateIndustryContent(entity.slug);
  }

  async restore(id: string, actorId: string): Promise<IndustryResponse> {
    const entity = await this.getOrThrow(id, true);
    if (!entity.isDeleted) throw new BadRequestError('Industry is not in trash');

    const restored = await industryRepository.restoreById(id, actorId);
    if (!restored) throw new NotFoundError('Industry');

    loggers.admin.info('Industry restored', { id, actorId });
    revalidateIndustryContent(restored.slug);
    return this.toResponse(restored);
  }

  async permanentDelete(id: string, actorId: string): Promise<void> {
    await this.getOrThrow(id, true);
    await industryRepository.permanentDeleteById(id);
    loggers.admin.info('Industry permanently deleted', { id, actorId });
    revalidateIndustryContent();
  }
}

export const industryService = new IndustryService();
