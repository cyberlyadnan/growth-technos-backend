import { Types, UpdateQuery } from 'mongoose';
import { CmsPublicationStatus, ServiceKind } from '@core/constants/cms';
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
import {
  BlogRef,
  CreateIndustryDto,
  IndustryPublicFeedsResponse,
  IndustryResponse,
  IndustrySitemapEntry,
  PortfolioRef,
  ServiceRef,
  UpdateIndustryDto,
} from '../types/industry.types';

type PopulatedRef = {
  id?: string;
  _id?: { toString(): string };
  name?: string;
  title?: string;
  slug?: string;
  kind?: ServiceKind;
  icon?: string;
  shortDescription?: string;
  excerpt?: string;
  projectType?: string;
  publicationStatus?: string;
  isDeleted?: boolean;
};

const RELATED_POPULATE = [
  {
    path: 'relatedServices',
    select: 'title slug shortDescription icon kind publicationStatus isDeleted',
  },
  {
    path: 'relatedPortfolio',
    select: 'title slug shortDescription projectType publicationStatus isDeleted',
  },
  {
    path: 'relatedBlogs',
    select: 'title slug excerpt publicationStatus isDeleted',
  },
];

function toObjectId(value: string | undefined | null): Types.ObjectId | undefined {
  if (!value) return undefined;
  return new Types.ObjectId(value);
}

function toObjectIdArray(values?: string[]): Types.ObjectId[] | undefined {
  if (values === undefined) return undefined;
  return values.map((id) => new Types.ObjectId(id));
}

function refId(doc: PopulatedRef | Types.ObjectId | string | undefined | null): string | undefined {
  if (!doc) return undefined;
  if (typeof doc === 'string') return doc;
  if (doc instanceof Types.ObjectId) return doc.toString();
  return doc.id ?? doc._id?.toString();
}

const industryRepository = new TaxonomyRepository<IIndustry>(Industry);

function isPubliclyVisible(entity: IIndustry): boolean {
  if (!entity.isActive || entity.isDeleted) return false;
  if (!entity.publicationStatus) return true;
  return entity.publicationStatus === CmsPublicationStatus.PUBLISHED;
}

export class IndustryService {
  private mapServiceRef(doc: PopulatedRef | Types.ObjectId | string): ServiceRef | undefined {
    const id = refId(doc);
    if (!id) return undefined;
    if (typeof doc === 'string' || doc instanceof Types.ObjectId) {
      return { id, title: '', slug: '' };
    }
    if (doc.isDeleted) return undefined;
    return {
      id,
      title: doc.title ?? doc.name ?? '',
      slug: doc.slug ?? '',
      kind: doc.kind,
      icon: doc.icon,
      shortDescription: doc.shortDescription,
    };
  }

  private mapPortfolioRef(doc: PopulatedRef | Types.ObjectId | string): PortfolioRef | undefined {
    const id = refId(doc);
    if (!id) return undefined;
    if (typeof doc === 'string' || doc instanceof Types.ObjectId) {
      return { id, title: '', slug: '' };
    }
    if (doc.isDeleted) return undefined;
    return {
      id,
      title: doc.title ?? '',
      slug: doc.slug ?? '',
      projectType: doc.projectType,
      shortDescription: doc.shortDescription,
    };
  }

  private mapBlogRef(doc: PopulatedRef | Types.ObjectId | string): BlogRef | undefined {
    const id = refId(doc);
    if (!id) return undefined;
    if (typeof doc === 'string' || doc instanceof Types.ObjectId) {
      return { id, title: '', slug: '' };
    }
    if (doc.isDeleted) return undefined;
    return {
      id,
      title: doc.title ?? '',
      slug: doc.slug ?? '',
      excerpt: doc.excerpt,
    };
  }

  private filterPublishedRelated<T extends PopulatedRef>(docs: T[]): T[] {
    return docs.filter(
      (doc) =>
        Boolean(doc?.slug) &&
        doc.publicationStatus === CmsPublicationStatus.PUBLISHED &&
        !doc.isDeleted,
    );
  }

  private toResponse(entity: IIndustry, publicOnly = false): IndustryResponse {
    let relatedServices = (entity.relatedServices as unknown as Array<PopulatedRef | Types.ObjectId | string>) ?? [];
    let relatedPortfolio =
      (entity.relatedPortfolio as unknown as Array<PopulatedRef | Types.ObjectId | string>) ?? [];
    let relatedBlogs = (entity.relatedBlogs as unknown as Array<PopulatedRef | Types.ObjectId | string>) ?? [];

    if (publicOnly) {
      relatedServices = this.filterPublishedRelated(
        relatedServices.filter((item): item is PopulatedRef => typeof item === 'object' && !(item instanceof Types.ObjectId)),
      );
      relatedPortfolio = this.filterPublishedRelated(
        relatedPortfolio.filter((item): item is PopulatedRef => typeof item === 'object' && !(item instanceof Types.ObjectId)),
      );
      relatedBlogs = this.filterPublishedRelated(
        relatedBlogs.filter((item): item is PopulatedRef => typeof item === 'object' && !(item instanceof Types.ObjectId)),
      );
    }

    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      shortDescription: entity.shortDescription,
      fullDescription: entity.fullDescription,
      icon: entity.icon,
      isActive: entity.isActive,
      isFeatured: entity.isFeatured ?? false,
      displayOrder: entity.displayOrder ?? 0,
      publicationStatus: entity.publicationStatus ?? CmsPublicationStatus.DRAFT,
      publishedAt: entity.publishedAt?.toISOString(),
      hero: entity.hero ?? null,
      trustedBy: entity.trustedBy ?? null,
      problems: entity.problems ?? [],
      solutions: entity.solutions ?? [],
      benefits: entity.benefits ?? [],
      businessResults: entity.businessResults ?? [],
      process: entity.process ?? [],
      whyUs: entity.whyUs ?? [],
      technology: entity.technology ?? [],
      pricing: entity.pricing ?? null,
      faqs: entity.faqs ?? [],
      resources: entity.resources ?? [],
      auditCta: entity.auditCta ?? null,
      finalCta: entity.finalCta ?? null,
      bannerImage: entity.bannerImage ?? null,
      gallery: entity.gallery ?? [],
      content: entity.content ?? null,
      testimonials: entity.testimonials ?? [],
      relatedServices: relatedServices
        .map((item) => this.mapServiceRef(item))
        .filter((item): item is ServiceRef => Boolean(item)),
      relatedPortfolio: relatedPortfolio
        .map((item) => this.mapPortfolioRef(item))
        .filter((item): item is PortfolioRef => Boolean(item)),
      relatedBlogs: relatedBlogs
        .map((item) => this.mapBlogRef(item))
        .filter((item): item is BlogRef => Boolean(item)),
      metaTitle: entity.metaTitle,
      metaDescription: entity.metaDescription,
      metaKeywords: entity.metaKeywords,
      canonicalUrl: entity.canonicalUrl,
      robotsIndex: entity.robotsIndex,
      robotsFollow: entity.robotsFollow,
      seoScore: entity.seoScore,
      includeInSitemap: entity.includeInSitemap,
      ogTitle: entity.ogTitle,
      ogDescription: entity.ogDescription,
      ogImage: entity.ogImage,
      twitterTitle: entity.twitterTitle,
      twitterDescription: entity.twitterDescription,
      twitterImage: entity.twitterImage,
      faqSchema: entity.faqSchema ?? false,
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
      shortDescription:
        dto.shortDescription ??
        dto.description ??
        existing?.shortDescription ??
        existing?.description,
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
    const publicationStatus = dto.publicationStatus;
    const publishedAt =
      publicationStatus === CmsPublicationStatus.PUBLISHED
        ? dto.publishedAt ?? existing?.publishedAt ?? new Date()
        : publicationStatus !== undefined
          ? dto.publishedAt ?? null
          : undefined;

    return {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description || undefined }),
      ...(dto.shortDescription !== undefined && {
        shortDescription: dto.shortDescription || undefined,
      }),
      ...(dto.fullDescription !== undefined && {
        fullDescription: dto.fullDescription || undefined,
      }),
      ...(dto.icon !== undefined && { icon: dto.icon || undefined }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
      ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
      ...(publicationStatus !== undefined && { publicationStatus }),
      ...(publishedAt !== undefined && { publishedAt }),
      ...(dto.hero !== undefined && { hero: dto.hero }),
      ...(dto.trustedBy !== undefined && { trustedBy: dto.trustedBy }),
      ...(dto.problems !== undefined && { problems: dto.problems }),
      ...(dto.solutions !== undefined && { solutions: dto.solutions }),
      ...(dto.benefits !== undefined && { benefits: dto.benefits }),
      ...(dto.businessResults !== undefined && { businessResults: dto.businessResults }),
      ...(dto.process !== undefined && { process: dto.process }),
      ...(dto.whyUs !== undefined && { whyUs: dto.whyUs }),
      ...(dto.technology !== undefined && { technology: dto.technology }),
      ...(dto.pricing !== undefined && { pricing: dto.pricing }),
      ...(dto.faqs !== undefined && { faqs: dto.faqs }),
      ...(dto.resources !== undefined && { resources: dto.resources }),
      ...(dto.auditCta !== undefined && { auditCta: dto.auditCta }),
      ...(dto.finalCta !== undefined && { finalCta: dto.finalCta }),
      ...(dto.bannerImage !== undefined && { bannerImage: dto.bannerImage }),
      ...(dto.gallery !== undefined && { gallery: dto.gallery }),
      ...(dto.content !== undefined && { content: dto.content }),
      ...(dto.testimonials !== undefined && { testimonials: dto.testimonials }),
      ...(dto.relatedServices !== undefined && {
        relatedServices: toObjectIdArray(dto.relatedServices),
      }),
      ...(dto.relatedPortfolio !== undefined && {
        relatedPortfolio: toObjectIdArray(dto.relatedPortfolio),
      }),
      ...(dto.relatedBlogs !== undefined && {
        relatedBlogs: toObjectIdArray(dto.relatedBlogs),
      }),
      ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle || undefined }),
      ...(dto.metaDescription !== undefined && {
        metaDescription: dto.metaDescription || undefined,
      }),
      ...(dto.metaKeywords !== undefined && { metaKeywords: dto.metaKeywords }),
      ...(dto.canonicalUrl !== undefined && { canonicalUrl: dto.canonicalUrl || undefined }),
      ...(dto.robotsIndex !== undefined && { robotsIndex: dto.robotsIndex }),
      ...(dto.robotsFollow !== undefined && { robotsFollow: dto.robotsFollow }),
      ...(dto.includeInSitemap !== undefined && { includeInSitemap: dto.includeInSitemap }),
      ...(dto.ogTitle !== undefined && { ogTitle: dto.ogTitle || undefined }),
      ...(dto.ogDescription !== undefined && { ogDescription: dto.ogDescription || undefined }),
      ...(dto.ogImage !== undefined && { ogImage: dto.ogImage || undefined }),
      ...(dto.twitterTitle !== undefined && { twitterTitle: dto.twitterTitle || undefined }),
      ...(dto.twitterDescription !== undefined && {
        twitterDescription: dto.twitterDescription || undefined,
      }),
      ...(dto.twitterImage !== undefined && { twitterImage: dto.twitterImage || undefined }),
      ...(dto.faqSchema !== undefined && { faqSchema: dto.faqSchema }),
      seoScore: this.resolveSeoScore(dto, existing),
      updatedBy: toObjectId(actorId),
    };
  }

  private async getOrThrow(id: string, includeDeleted = false): Promise<IIndustry> {
    const query = Industry.findById(id).populate(RELATED_POPULATE);
    if (includeDeleted) query.setOptions({ includeDeleted: true });
    const entity = await query.exec();
    if (!entity) throw new NotFoundError('Industry');
    return entity;
  }

  private async resolveSlug(name: string, slug?: string, excludeId?: string): Promise<string> {
    const base = slugify(slug || name);
    return ensureUniqueSlug(base, async (candidate) =>
      industryRepository.slugExists(candidate, excludeId),
    );
  }

  private buildPublicFilter(search?: string): Record<string, unknown> {
    const and: Record<string, unknown>[] = [
      {
        $or: [
          { publicationStatus: CmsPublicationStatus.PUBLISHED },
          { publicationStatus: { $exists: false } },
        ],
      },
    ];

    if (search?.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      and.push({
        $or: [
          { name: regex },
          { slug: regex },
          { description: regex },
          { shortDescription: regex },
        ],
      });
    }

    return {
      isDeleted: { $ne: true },
      isActive: true,
      $and: and,
    };
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
        ['name', 'slug', 'description', 'shortDescription'],
      ),
      industryRepository.count(
        {
          search: query.search,
          isActive: query.isActive,
          includeTrash: query.includeTrash,
          trashOnly: query.trashOnly,
        },
        ['name', 'slug', 'description', 'shortDescription'],
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
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const skip = (page - 1) * limit;
    const sortField = query.sort ?? 'displayOrder';
    const sortOrder = (query.order ?? 'asc') === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder as 1 | -1 };
    if (sortField !== 'name') {
      sort.name = 1;
    }

    const filter = this.buildPublicFilter(query.search);

    const [items, total] = await Promise.all([
      Industry.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      Industry.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((item) => this.toResponse(item, true)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<IndustryResponse> {
    return this.toResponse(await this.getOrThrow(id));
  }

  async getPublicBySlug(slug: string): Promise<IndustryResponse> {
    const entity = await Industry.findOne({
      slug: slug.toLowerCase(),
      isDeleted: { $ne: true },
      isActive: true,
    })
      .populate(RELATED_POPULATE)
      .exec();

    if (!entity || !isPubliclyVisible(entity)) {
      throw new NotFoundError('Industry');
    }

    return this.toResponse(entity, true);
  }

  async getPublicFeeds(): Promise<IndustryPublicFeedsResponse> {
    const { items } = await this.listPublic({
      limit: 100,
      sort: 'displayOrder',
      order: 'asc',
    });
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
    const publicationStatus = dto.publicationStatus ?? CmsPublicationStatus.DRAFT;
    const entity = await industryRepository.create({
      name: dto.name,
      slug,
      description: dto.description || undefined,
      icon: dto.icon || undefined,
      isActive: dto.isActive ?? true,
      isFeatured: dto.isFeatured ?? false,
      displayOrder: dto.displayOrder ?? 0,
      publicationStatus,
      publishedAt:
        publicationStatus === CmsPublicationStatus.PUBLISHED
          ? dto.publishedAt ?? new Date()
          : null,
      metaKeywords: dto.metaKeywords ?? [],
      robotsIndex: dto.robotsIndex ?? true,
      robotsFollow: dto.robotsFollow ?? true,
      includeInSitemap: dto.includeInSitemap ?? true,
      faqSchema: dto.faqSchema ?? false,
      problems: dto.problems ?? [],
      solutions: dto.solutions ?? [],
      benefits: dto.benefits ?? [],
      businessResults: dto.businessResults ?? [],
      process: dto.process ?? [],
      whyUs: dto.whyUs ?? [],
      technology: dto.technology ?? [],
      faqs: dto.faqs ?? [],
      resources: dto.resources ?? [],
      gallery: dto.gallery ?? [],
      testimonials: dto.testimonials ?? [],
      relatedServices: toObjectIdArray(dto.relatedServices) ?? [],
      relatedPortfolio: toObjectIdArray(dto.relatedPortfolio) ?? [],
      relatedBlogs: toObjectIdArray(dto.relatedBlogs) ?? [],
      createdBy: toObjectId(actorId),
      ...this.buildIndustryData({ ...dto, publicationStatus }, actorId),
    } as unknown as Partial<IIndustry>);

    loggers.admin.info('Industry created', { id: entity.id, actorId });
    revalidateIndustryContent(entity.slug);
    return this.toResponse(await this.getOrThrow(entity.id));
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
    return this.toResponse(await this.getOrThrow(id));
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
    return this.toResponse(await this.getOrThrow(id, true));
  }

  async permanentDelete(id: string, actorId: string): Promise<void> {
    await this.getOrThrow(id, true);
    await industryRepository.permanentDeleteById(id);
    loggers.admin.info('Industry permanently deleted', { id, actorId });
    revalidateIndustryContent();
  }
}

export const industryService = new IndustryService();
