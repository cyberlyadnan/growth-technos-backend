import { Types } from 'mongoose';
import { CmsPublicationStatus, ServiceKind } from '@core/constants/cms';
import { BadRequestError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import { calculateCmsSeoScore } from '@core/utils/cms-seo-score';
import { sanitizeBlogHtml } from '@core/utils/sanitize-html';
import { ensureUniqueSlug, slugify } from '@core/utils/slug';
import { revalidateServiceContent } from '@core/revalidation/frontend-revalidation';
import { Blog } from '@modules/blogs/model/blog.model';
import { Industry } from '@modules/industries/model/industry.model';
import { PortfolioProject } from '@modules/portfolio/model/portfolio.model';
import { IService, Service } from '../model/service.model';
import { serviceRepository, toObjectId } from '../repository/service.repository';
import {
  CreateServiceDto,
  ListServicesQuery,
  ScheduleServiceDto,
  ServiceBulkActionDto,
  ServicePublicFeedsResponse,
  ServiceResponse,
  ServiceSitemapEntry,
  UpdateServiceDto,
} from '../types/service.types';

type PopulatedRef = {
  id?: string;
  _id?: { toString(): string };
  name?: string;
  title?: string;
  slug: string;
  kind?: ServiceKind;
  icon?: string;
  projectType?: string;
  publicationStatus?: string;
  isDeleted?: boolean;
};

function refId(doc: PopulatedRef | undefined | null): string | undefined {
  if (!doc) return undefined;
  return doc.id ?? doc._id?.toString();
}

export class ServiceService {
  private readonly noMatchObjectId = new Types.ObjectId().toString();

  private async resolveIndustryIdBySlug(slug?: string): Promise<string | undefined> {
    if (!slug) return undefined;

    const doc = await Industry.findOne({
      slug: slug.toLowerCase(),
      isDeleted: { $ne: true },
      isActive: true,
    })
      .select('_id')
      .lean();

    if (!doc?._id) return this.noMatchObjectId;
    return doc._id.toString();
  }

  private mapTaxonomyRef(doc: PopulatedRef | undefined | null) {
    if (!doc || !doc.name) return undefined;
    return { id: refId(doc)!, name: doc.name, slug: doc.slug, icon: doc.icon };
  }

  private mapServiceRef(doc: PopulatedRef) {
    return {
      id: refId(doc)!,
      title: doc.title ?? doc.name ?? '',
      slug: doc.slug,
      kind: doc.kind ?? ServiceKind.CATEGORY,
    };
  }

  private mapBlogRef(doc: PopulatedRef) {
    return { id: refId(doc)!, title: doc.title ?? '', slug: doc.slug };
  }

  private mapPortfolioRef(doc: PopulatedRef) {
    return {
      id: refId(doc)!,
      title: doc.title ?? '',
      slug: doc.slug,
      projectType: doc.projectType ?? 'case_study',
    };
  }

  private filterPublishedRelated(docs: PopulatedRef[]): PopulatedRef[] {
    return docs.filter(
      (doc) =>
        doc?.slug &&
        doc.publicationStatus === CmsPublicationStatus.PUBLISHED &&
        !doc.isDeleted,
    );
  }

  private toServiceResponse(service: IService, publicOnly = false): ServiceResponse {
    const industries = (service.industries as unknown as PopulatedRef[]) ?? [];
    let relatedServices = (service.relatedServices as unknown as PopulatedRef[]) ?? [];
    let relatedBlogs = (service.relatedBlogs as unknown as PopulatedRef[]) ?? [];
    let relatedPortfolio = (service.relatedPortfolio as unknown as PopulatedRef[]) ?? [];

    if (publicOnly) {
      relatedServices = this.filterPublishedRelated(relatedServices);
      relatedBlogs = this.filterPublishedRelated(relatedBlogs);
      relatedPortfolio = this.filterPublishedRelated(relatedPortfolio);
    }

    return {
      id: service.id,
      title: service.title,
      slug: service.slug,
      shortDescription: service.shortDescription,
      fullDescription: service.fullDescription,
      heroTitle: service.heroTitle,
      heroSubtitle: service.heroSubtitle,
      heroImage: service.heroImage ?? undefined,
      bannerImage: service.bannerImage ?? undefined,
      icon: service.icon,
      iconBg: service.iconBg,
      iconColor: service.iconColor,
      kind: service.kind,
      categorySlug: service.categorySlug,
      categoryTitle: service.categoryTitle,
      parentService: service.parentService
        ? this.mapServiceRef(service.parentService as unknown as PopulatedRef)
        : undefined,
      industries: industries.map((item) => this.mapTaxonomyRef(item)!).filter(Boolean),
      primaryIndustry: this.mapTaxonomyRef(service.primaryIndustry as unknown as PopulatedRef),
      technologyStack: service.technologyStack ?? [],
      features: service.features ?? [],
      benefits: service.benefits ?? [],
      process: service.process ?? [],
      pricing: service.pricing ?? undefined,
      showPricing: service.showPricing ?? false,
      deliverables: service.deliverables ?? [],
      timeline: service.timeline,
      cta: service.cta ?? undefined,
      faqs: service.faqs ?? [],
      content: service.content
        ? {
            format: service.content.format,
            html: service.content.html ?? '',
            plainText: service.content.plainText,
            document: service.content.document ?? null,
          }
        : undefined,
      tableOfContents: service.tableOfContents ?? [],
      relatedServices: relatedServices.map((item) => this.mapServiceRef(item)),
      relatedBlogs: relatedBlogs.map((item) => this.mapBlogRef(item)),
      relatedPortfolio: relatedPortfolio.map((item) => this.mapPortfolioRef(item)),
      publicationStatus: service.publicationStatus,
      publishedAt: service.publishedAt?.toISOString(),
      scheduledPublishAt: service.scheduledPublishAt?.toISOString(),
      unpublishedAt: service.unpublishedAt?.toISOString(),
      isFeatured: service.isFeatured,
      isPinned: service.isPinned,
      displayOrder: service.displayOrder,
      viewCount: service.viewCount,
      duplicateOf: service.duplicateOf?.toString(),
      lastAutosavedAt: service.lastAutosavedAt?.toISOString(),
      metaTitle: service.metaTitle,
      metaDescription: service.metaDescription,
      canonical: service.canonical,
      openGraph: service.openGraph as Record<string, unknown> | undefined,
      twitterCard: service.twitterCard as Record<string, unknown> | undefined,
      schemaJson: service.schemaJson as Record<string, unknown> | undefined,
      robots: service.robots,
      indexable: service.indexable,
      breadcrumbs: service.breadcrumbs,
      metaKeywords: service.metaKeywords,
      canonicalUrl: service.canonicalUrl,
      robotsIndex: service.robotsIndex,
      robotsFollow: service.robotsFollow,
      seoScore: service.seoScore,
      faqSchema: service.faqSchema,
      serviceSchema: service.serviceSchema as Record<string, unknown> | undefined,
      organizationSchema: service.organizationSchema as Record<string, unknown> | undefined,
      breadcrumbSchema: service.breadcrumbSchema as Record<string, unknown> | undefined,
      includeInSitemap: service.includeInSitemap,
      isDeleted: service.isDeleted,
      deletedAt: service.deletedAt?.toISOString(),
      permanentlyDeletedAt: service.permanentlyDeletedAt?.toISOString(),
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    };
  }

  private toServiceSummaryResponse(service: IService): ServiceResponse {
    const response = this.toServiceResponse(service);
    return {
      ...response,
      fullDescription: response.fullDescription?.slice(0, 280),
      content: response.content
        ? {
            format: response.content.format,
            html: '',
            document: null,
            plainText: response.content.plainText?.slice(0, 280) ?? '',
          }
        : undefined,
      faqs: [],
      process: [],
    };
  }

  private async getServiceOrThrow(id: string, includeDeleted = false): Promise<IService> {
    const service = await serviceRepository.findById(id, includeDeleted);
    if (!service) throw new NotFoundError('Service');
    return service;
  }

  private async resolveSlug(title: string, slug?: string, excludeId?: string): Promise<string> {
    const base = slugify(slug || title);
    return ensureUniqueSlug(base, async (candidate) => serviceRepository.slugExists(candidate, excludeId));
  }

  private buildContentPayload(content?: CreateServiceDto['content']) {
    if (!content) return undefined;
    const html = sanitizeBlogHtml(content.html ?? '');
    return {
      format: content.format ?? 'html',
      html,
      plainText: content.plainText?.trim() || html.replace(/<[^>]+>/g, ' ').trim(),
      document: content.document ?? null,
    };
  }

  private async validateReferences(dto: {
    industries?: string[];
    primaryIndustry?: string | null;
    parentService?: string | null;
    relatedServices?: string[];
    relatedBlogs?: string[];
    relatedPortfolio?: string[];
  }): Promise<void> {
    if (dto.industries?.length) {
      const count = await Industry.countDocuments({ _id: { $in: dto.industries } });
      if (count !== dto.industries.length) throw new BadRequestError('One or more industries not found');
    }

    if (dto.primaryIndustry) {
      const industry = await Industry.findById(dto.primaryIndustry).exec();
      if (!industry) throw new BadRequestError('Primary industry not found');
    }

    if (dto.parentService) {
      const parent = await serviceRepository.findById(dto.parentService);
      if (!parent) throw new BadRequestError('Parent service not found');
    }

    if (dto.relatedServices?.length) {
      const serviceCount = await Service.countDocuments({
        _id: { $in: dto.relatedServices },
        isDeleted: { $ne: true },
      });
      if (serviceCount !== dto.relatedServices.length) {
        throw new BadRequestError('One or more related services not found');
      }
    }

    if (dto.relatedBlogs?.length) {
      const blogCount = await Blog.countDocuments({ _id: { $in: dto.relatedBlogs }, isDeleted: { $ne: true } });
      if (blogCount !== dto.relatedBlogs.length) throw new BadRequestError('One or more related blogs not found');
    }

    if (dto.relatedPortfolio?.length) {
      const portfolioCount = await PortfolioProject.countDocuments({
        _id: { $in: dto.relatedPortfolio },
        isDeleted: { $ne: true },
      });
      if (portfolioCount !== dto.relatedPortfolio.length) {
        throw new BadRequestError('One or more related portfolio projects not found');
      }
    }
  }

  private buildServiceData(
    dto: CreateServiceDto | UpdateServiceDto,
    actorId: string,
    existing?: IService,
  ): Record<string, unknown> {
    const content = dto.content !== undefined ? this.buildContentPayload(dto.content) : undefined;

    return {
      ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription || undefined }),
      ...(dto.fullDescription !== undefined && { fullDescription: dto.fullDescription || undefined }),
      ...(dto.heroTitle !== undefined && { heroTitle: dto.heroTitle || undefined }),
      ...(dto.heroSubtitle !== undefined && { heroSubtitle: dto.heroSubtitle || undefined }),
      ...(dto.heroImage !== undefined && { heroImage: dto.heroImage }),
      ...(dto.bannerImage !== undefined && { bannerImage: dto.bannerImage }),
      ...(dto.icon !== undefined && { icon: dto.icon }),
      ...(dto.iconBg !== undefined && { iconBg: dto.iconBg }),
      ...(dto.iconColor !== undefined && { iconColor: dto.iconColor }),
      ...(dto.kind !== undefined && { kind: dto.kind }),
      ...(dto.categorySlug !== undefined && { categorySlug: dto.categorySlug?.toLowerCase() }),
      ...(dto.categoryTitle !== undefined && { categoryTitle: dto.categoryTitle }),
      ...(dto.parentService !== undefined && {
        parentService: toObjectId(dto.parentService ?? undefined) ?? null,
      }),
      ...(dto.industries !== undefined && {
        industries: dto.industries.map((id) => toObjectId(id)!),
      }),
      ...(dto.primaryIndustry !== undefined && {
        primaryIndustry: toObjectId(dto.primaryIndustry ?? undefined) ?? null,
      }),
      ...(dto.technologyStack !== undefined && { technologyStack: dto.technologyStack }),
      ...(dto.features !== undefined && { features: dto.features }),
      ...(dto.benefits !== undefined && { benefits: dto.benefits }),
      ...(dto.process !== undefined && { process: dto.process }),
      ...(dto.pricing !== undefined && { pricing: dto.pricing }),
      ...(dto.showPricing !== undefined && { showPricing: dto.showPricing }),
      ...(dto.deliverables !== undefined && { deliverables: dto.deliverables }),
      ...(dto.timeline !== undefined && { timeline: dto.timeline }),
      ...(dto.cta !== undefined && { cta: dto.cta }),
      ...(dto.faqs !== undefined && { faqs: dto.faqs }),
      ...(content && { content }),
      ...(dto.tableOfContents !== undefined && { tableOfContents: dto.tableOfContents }),
      ...(dto.relatedServices !== undefined && {
        relatedServices: dto.relatedServices.map((id) => toObjectId(id)!),
      }),
      ...(dto.relatedBlogs !== undefined && {
        relatedBlogs: dto.relatedBlogs.map((id) => toObjectId(id)!),
      }),
      ...(dto.relatedPortfolio !== undefined && {
        relatedPortfolio: dto.relatedPortfolio.map((id) => toObjectId(id)!),
      }),
      ...(dto.publicationStatus !== undefined && { publicationStatus: dto.publicationStatus }),
      ...(dto.scheduledPublishAt !== undefined && {
        scheduledPublishAt: dto.scheduledPublishAt ? new Date(dto.scheduledPublishAt) : null,
      }),
      ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
      ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
      ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
      ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
      ...(dto.metaDescription !== undefined && { metaDescription: dto.metaDescription }),
      ...(dto.canonical !== undefined && { canonical: dto.canonical || undefined }),
      ...(dto.metaKeywords !== undefined && { metaKeywords: dto.metaKeywords }),
      ...(dto.canonicalUrl !== undefined && { canonicalUrl: dto.canonicalUrl || undefined }),
      ...(dto.robotsIndex !== undefined && { robotsIndex: dto.robotsIndex }),
      ...(dto.robotsFollow !== undefined && { robotsFollow: dto.robotsFollow }),
      ...(dto.faqSchema !== undefined && { faqSchema: dto.faqSchema }),
      ...(dto.serviceSchema !== undefined && { serviceSchema: dto.serviceSchema }),
      ...(dto.organizationSchema !== undefined && { organizationSchema: dto.organizationSchema }),
      ...(dto.breadcrumbSchema !== undefined && { breadcrumbSchema: dto.breadcrumbSchema }),
      ...(dto.includeInSitemap !== undefined && { includeInSitemap: dto.includeInSitemap }),
      ...(dto.indexable !== undefined && { indexable: dto.indexable }),
      ...(dto.robots !== undefined && { robots: dto.robots }),
      ...(dto.openGraph !== undefined && { openGraph: dto.openGraph }),
      ...(dto.twitterCard !== undefined && { twitterCard: dto.twitterCard }),
      ...(dto.schemaJson !== undefined && { schemaJson: dto.schemaJson }),
      ...(dto.breadcrumbs !== undefined && { breadcrumbs: dto.breadcrumbs }),
      updatedBy: actorId,
      ...(existing === undefined && { createdBy: actorId }),
    };
  }

  private resolveSeoScore(dto: CreateServiceDto | UpdateServiceDto, existing?: IService): number {
    return calculateCmsSeoScore({
      title: dto.title ?? existing?.title ?? '',
      slug: dto.slug ?? existing?.slug,
      shortDescription: dto.shortDescription ?? existing?.shortDescription,
      metaTitle: dto.metaTitle ?? existing?.metaTitle,
      metaDescription: dto.metaDescription ?? existing?.metaDescription,
      metaKeywords: dto.metaKeywords ?? existing?.metaKeywords,
      canonicalUrl: dto.canonicalUrl ?? existing?.canonicalUrl,
      featuredImageUrl: (dto.heroImage ?? existing?.heroImage)?.url,
      faqCount: (dto.faqs ?? existing?.faqs)?.length ?? 0,
      robotsIndex: dto.robotsIndex ?? existing?.robotsIndex ?? true,
      includeInSitemap: dto.includeInSitemap ?? existing?.includeInSitemap ?? true,
    }).score;
  }

  async list(query: ListServicesQuery): Promise<{ services: ServiceResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);

    const [services, total] = await Promise.all([
      serviceRepository.findMany({
        skip,
        limit,
        sort,
        search: query.search,
        publicationStatus: query.publicationStatus,
        kind: query.kind,
        categorySlug: query.categorySlug,
        parentService: query.parentService,
        industry: query.industry,
        isFeatured: query.isFeatured,
        isPinned: query.isPinned,
        includeTrash: query.includeTrash,
        trashOnly: query.trashOnly,
      }),
      serviceRepository.count({
        search: query.search,
        publicationStatus: query.publicationStatus,
        kind: query.kind,
        categorySlug: query.categorySlug,
        parentService: query.parentService,
        industry: query.industry,
        isFeatured: query.isFeatured,
        isPinned: query.isPinned,
        includeTrash: query.includeTrash,
        trashOnly: query.trashOnly,
      }),
    ]);

    return {
      services: services.map((service) => this.toServiceResponse(service)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async listPublished(
    query: ListServicesQuery,
  ): Promise<{ services: ServiceResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);
    const industry =
      query.industry ??
      (query.industrySlug ? await this.resolveIndustryIdBySlug(query.industrySlug) : undefined);

    const [services, total] = await Promise.all([
      serviceRepository.findMany({
        skip,
        limit,
        sort: sort.publishedAt ? sort : { displayOrder: 1, publishedAt: -1, isPinned: -1 },
        search: query.search,
        kind: query.kind,
        categorySlug: query.categorySlug,
        parentService: query.parentService,
        industry,
        isFeatured: query.isFeatured,
        isPinned: query.isPinned,
        publishedOnly: true,
        summaryOnly: true,
      }),
      serviceRepository.count({
        search: query.search,
        kind: query.kind,
        categorySlug: query.categorySlug,
        parentService: query.parentService,
        industry,
        isFeatured: query.isFeatured,
        isPinned: query.isPinned,
        publishedOnly: true,
      }),
    ]);

    return {
      services: services.map((service) => this.toServiceSummaryResponse(service)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<ServiceResponse> {
    return this.toServiceResponse(await this.getServiceOrThrow(id));
  }

  async getPublishedBySlug(slug: string): Promise<ServiceResponse> {
    const service = await serviceRepository.findBySlug(slug, true);
    if (!service) throw new NotFoundError('Service');

    void serviceRepository.incrementViewCount(service.id);
    return this.toServiceResponse(service, true);
  }

  async getPublicFeeds(): Promise<ServicePublicFeedsResponse> {
    const services = await serviceRepository.findPublishedForFeeds();
    const sitemap: ServiceSitemapEntry[] = [];

    services.forEach((service) => {
      if (service.robotsIndex && service.includeInSitemap) {
        sitemap.push({
          slug: service.slug,
          updatedAt: service.updatedAt.toISOString(),
          publishedAt: service.publishedAt?.toISOString(),
        });
      }
    });

    return { sitemap };
  }

  async create(dto: CreateServiceDto, actorId: string): Promise<ServiceResponse> {
    await this.validateReferences(dto);

    const slug = await this.resolveSlug(dto.title, dto.slug);
    const service = await serviceRepository.create({
      ...this.buildServiceData(dto, actorId),
      title: dto.title,
      slug,
      kind: dto.kind ?? ServiceKind.CATEGORY,
      industries: (dto.industries ?? []).map((id) => toObjectId(id)!),
      primaryIndustry: toObjectId(dto.primaryIndustry ?? undefined) ?? undefined,
      parentService: toObjectId(dto.parentService ?? undefined) ?? undefined,
      technologyStack: dto.technologyStack ?? [],
      features: dto.features ?? [],
      benefits: dto.benefits ?? [],
      process: dto.process ?? [],
      deliverables: dto.deliverables ?? [],
      faqs: dto.faqs ?? [],
      tableOfContents: dto.tableOfContents ?? [],
      relatedServices: (dto.relatedServices ?? []).map((id) => toObjectId(id)!),
      relatedBlogs: (dto.relatedBlogs ?? []).map((id) => toObjectId(id)!),
      relatedPortfolio: (dto.relatedPortfolio ?? []).map((id) => toObjectId(id)!),
      publicationStatus: dto.publicationStatus ?? CmsPublicationStatus.DRAFT,
      scheduledPublishAt: dto.scheduledPublishAt ? new Date(dto.scheduledPublishAt) : undefined,
      isFeatured: dto.isFeatured ?? false,
      isPinned: dto.isPinned ?? false,
      showPricing: dto.showPricing ?? false,
      displayOrder: dto.displayOrder ?? 0,
      content: this.buildContentPayload(dto.content),
      seoScore: this.resolveSeoScore(dto),
      indexable: dto.indexable ?? true,
      robotsIndex: dto.robotsIndex ?? true,
      robotsFollow: dto.robotsFollow ?? true,
      includeInSitemap: dto.includeInSitemap ?? true,
      createdBy: toObjectId(actorId),
    } as Partial<IService>);

    loggers.admin.info('Service created', { serviceId: service.id, actorId });
    return this.toServiceResponse(service);
  }

  async update(id: string, dto: UpdateServiceDto, actorId: string): Promise<ServiceResponse> {
    const existing = await this.getServiceOrThrow(id);
    if (existing.isDeleted) throw new BadRequestError('Cannot update a service in trash. Restore it first.');

    await this.validateReferences(dto);

    const updateData = this.buildServiceData(dto, actorId, existing) as Partial<IService>;

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.slug || dto.title) {
      updateData.slug = await this.resolveSlug(dto.title ?? existing.title, dto.slug ?? existing.slug, id);
    }

    updateData.seoScore = this.resolveSeoScore(dto, existing);

    const updated = await serviceRepository.updateById(id, updateData);
    if (!updated) throw new NotFoundError('Service');

    loggers.admin.info('Service updated', { serviceId: id, actorId });
    if (updated.publicationStatus === CmsPublicationStatus.PUBLISHED) {
      revalidateServiceContent(updated.slug);
    }
    return this.toServiceResponse(updated);
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    const service = await this.getServiceOrThrow(id);
    if (service.isDeleted) throw new BadRequestError('Service is already in trash');
    await serviceRepository.softDeleteById(id, actorId);
    loggers.admin.info('Service moved to trash', { serviceId: id, actorId });
    if (service.publicationStatus === CmsPublicationStatus.PUBLISHED) {
      revalidateServiceContent(service.slug);
    }
  }

  async permanentDelete(id: string, actorId: string): Promise<void> {
    await this.getServiceOrThrow(id, true);
    await serviceRepository.permanentDeleteById(id);
    loggers.admin.info('Service permanently deleted', { serviceId: id, actorId });
    revalidateServiceContent();
  }

  async restore(id: string, actorId: string): Promise<ServiceResponse> {
    const service = await this.getServiceOrThrow(id, true);
    if (!service.isDeleted) throw new BadRequestError('Service is not in trash');

    const restored = await serviceRepository.restoreById(id, actorId);
    if (!restored) throw new NotFoundError('Service');

    loggers.admin.info('Service restored from trash', { serviceId: id, actorId });
    if (restored.publicationStatus === CmsPublicationStatus.PUBLISHED) {
      revalidateServiceContent(restored.slug);
    }
    return this.toServiceResponse(restored);
  }

  async publish(id: string, actorId: string): Promise<ServiceResponse> {
    const service = await this.getServiceOrThrow(id);
    if (service.isDeleted) throw new BadRequestError('Cannot publish a service in trash');

    const updated = await serviceRepository.updateById(id, {
      publicationStatus: CmsPublicationStatus.PUBLISHED,
      publishedAt: new Date(),
      scheduledPublishAt: null,
      unpublishedAt: null,
      updatedBy: actorId,
    });

    if (!updated) throw new NotFoundError('Service');
    loggers.admin.info('Service published', { serviceId: id, actorId });
    revalidateServiceContent(updated.slug);
    return this.toServiceResponse(updated);
  }

  async unpublish(id: string, actorId: string): Promise<ServiceResponse> {
    await this.getServiceOrThrow(id);

    const updated = await serviceRepository.updateById(id, {
      publicationStatus: CmsPublicationStatus.DRAFT,
      unpublishedAt: new Date(),
      updatedBy: actorId,
    });

    if (!updated) throw new NotFoundError('Service');
    revalidateServiceContent(updated.slug);
    return this.toServiceResponse(updated);
  }

  async schedule(id: string, dto: ScheduleServiceDto, actorId: string): Promise<ServiceResponse> {
    const service = await this.getServiceOrThrow(id);
    if (service.isDeleted) throw new BadRequestError('Cannot schedule a service in trash');

    const scheduledAt = new Date(dto.scheduledPublishAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestError('Scheduled publish time must be in the future');
    }

    const updated = await serviceRepository.updateById(id, {
      publicationStatus: CmsPublicationStatus.SCHEDULED,
      scheduledPublishAt: scheduledAt,
      updatedBy: actorId,
    });

    if (!updated) throw new NotFoundError('Service');
    return this.toServiceResponse(updated);
  }

  async archive(id: string, actorId: string): Promise<ServiceResponse> {
    await this.getServiceOrThrow(id);

    const updated = await serviceRepository.updateById(id, {
      publicationStatus: CmsPublicationStatus.ARCHIVED,
      updatedBy: actorId,
    });

    if (!updated) throw new NotFoundError('Service');
    return this.toServiceResponse(updated);
  }

  async duplicate(id: string, actorId: string): Promise<ServiceResponse> {
    const source = await this.getServiceOrThrow(id);
    const slug = await this.resolveSlug(`${source.slug}-copy`);

    const duplicate = await serviceRepository.create({
      title: `${source.title} (Copy)`,
      slug,
      shortDescription: source.shortDescription,
      fullDescription: source.fullDescription,
      heroTitle: source.heroTitle,
      heroSubtitle: source.heroSubtitle,
      heroImage: source.heroImage,
      bannerImage: source.bannerImage,
      icon: source.icon,
      iconBg: source.iconBg,
      iconColor: source.iconColor,
      kind: source.kind,
      categorySlug: source.categorySlug,
      categoryTitle: source.categoryTitle,
      parentService: source.parentService,
      industries: source.industries,
      primaryIndustry: source.primaryIndustry,
      technologyStack: source.technologyStack,
      features: source.features,
      benefits: source.benefits,
      process: source.process,
      pricing: source.pricing,
      showPricing: source.showPricing ?? false,
      deliverables: source.deliverables,
      timeline: source.timeline,
      cta: source.cta,
      faqs: source.faqs,
      content: source.content,
      tableOfContents: source.tableOfContents,
      relatedServices: source.relatedServices,
      relatedBlogs: source.relatedBlogs,
      relatedPortfolio: source.relatedPortfolio,
      publicationStatus: CmsPublicationStatus.DRAFT,
      isFeatured: false,
      isPinned: false,
      displayOrder: source.displayOrder,
      metaTitle: source.metaTitle,
      metaDescription: source.metaDescription,
      canonical: source.canonical,
      metaKeywords: source.metaKeywords,
      canonicalUrl: source.canonicalUrl,
      robotsIndex: source.robotsIndex,
      robotsFollow: source.robotsFollow,
      seoScore: source.seoScore,
      faqSchema: source.faqSchema,
      serviceSchema: source.serviceSchema,
      organizationSchema: source.organizationSchema,
      breadcrumbSchema: source.breadcrumbSchema,
      includeInSitemap: source.includeInSitemap,
      duplicateOf: source._id,
      createdBy: toObjectId(actorId),
      updatedBy: toObjectId(actorId),
    } as Partial<IService>);

    loggers.admin.info('Service duplicated', { serviceId: id, duplicateId: duplicate.id, actorId });
    return this.toServiceResponse(duplicate);
  }

  async bulkAction(dto: ServiceBulkActionDto, actorId: string): Promise<{ affected: number }> {
    let affected = 0;

    switch (dto.action) {
      case 'delete':
        affected = await serviceRepository.bulkSoftDelete(dto.ids, actorId);
        break;
      case 'publish':
        affected = await serviceRepository.bulkUpdateStatus(
          dto.ids,
          CmsPublicationStatus.PUBLISHED,
          actorId,
          { publishedAt: new Date(), scheduledPublishAt: null, unpublishedAt: null },
        );
        break;
      case 'archive':
        affected = await serviceRepository.bulkUpdateStatus(
          dto.ids,
          CmsPublicationStatus.ARCHIVED,
          actorId,
        );
        break;
      case 'restore':
        affected = await serviceRepository.bulkRestore(dto.ids, actorId);
        break;
      default:
        throw new BadRequestError('Unsupported bulk action');
    }

    loggers.admin.info('Service bulk action', { action: dto.action, count: affected, actorId });
    if (affected > 0 && ['publish', 'delete', 'archive', 'restore'].includes(dto.action)) {
      revalidateServiceContent();
    }
    return { affected };
  }
}

export const serviceService = new ServiceService();
