import { Types } from 'mongoose';
import { CmsPublicationStatus, PortfolioProjectType } from '@core/constants/cms';
import { BadRequestError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import { calculateCmsSeoScore } from '@core/utils/cms-seo-score';
import { sanitizeBlogHtml } from '@core/utils/sanitize-html';
import { ensureUniqueSlug, slugify } from '@core/utils/slug';
import { revalidatePortfolioContent } from '@core/revalidation/frontend-revalidation';
import { Blog } from '@modules/blogs/model/blog.model';
import { Industry } from '@modules/industries/model/industry.model';
import { Service } from '@modules/services/model/service.model';
import { IPortfolioProject, PortfolioProject } from '../model/portfolio.model';
import { portfolioRepository, toObjectId } from '../repository/portfolio.repository';
import {
  CreatePortfolioDto,
  ListPortfolioQuery,
  PortfolioBulkActionDto,
  PortfolioPublicFeedsResponse,
  PortfolioResponse,
  PortfolioSitemapEntry,
  SchedulePortfolioDto,
  UpdatePortfolioDto,
} from '../types/portfolio.types';

type PopulatedRef = {
  id?: string;
  _id?: { toString(): string };
  name?: string;
  title?: string;
  slug: string;
  icon?: string;
  projectType?: PortfolioProjectType;
  publicationStatus?: string;
  isDeleted?: boolean;
};

export class PortfolioService {
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
    return { id: doc.id ?? doc._id!.toString(), name: doc.name, slug: doc.slug, icon: doc.icon };
  }

  private mapServiceRef(doc: PopulatedRef) {
    return { id: doc.id ?? doc._id!.toString(), title: doc.title ?? '', slug: doc.slug };
  }

  private mapBlogRef(doc: PopulatedRef) {
    return { id: doc.id ?? doc._id!.toString(), title: doc.title ?? '', slug: doc.slug };
  }

  private mapPortfolioRef(doc: PopulatedRef) {
    return {
      id: doc.id ?? doc._id!.toString(),
      title: doc.title ?? '',
      slug: doc.slug,
      projectType: doc.projectType ?? PortfolioProjectType.CASE_STUDY,
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

  private toPortfolioResponse(project: IPortfolioProject, publicOnly = false): PortfolioResponse {
    const industries = (project.industries as unknown as PopulatedRef[]) ?? [];
    let relatedServices = (project.relatedServices as unknown as PopulatedRef[]) ?? [];
    let relatedBlogs = (project.relatedBlogs as unknown as PopulatedRef[]) ?? [];
    let relatedPortfolio = (project.relatedPortfolio as unknown as PopulatedRef[]) ?? [];

    if (publicOnly) {
      relatedServices = this.filterPublishedRelated(relatedServices);
      relatedBlogs = this.filterPublishedRelated(relatedBlogs);
      relatedPortfolio = this.filterPublishedRelated(relatedPortfolio);
    }

    return {
      id: project.id,
      title: project.title,
      slug: project.slug,
      clientName: project.clientName,
      industryLabel: project.industryLabel,
      category: project.category,
      shortDescription: project.shortDescription,
      fullDescription: project.fullDescription,
      challenge: project.challenge,
      solution: project.solution,
      process: project.process ?? [],
      technologyStack: project.technologyStack ?? [],
      projectDuration: project.projectDuration,
      servicesUsed: project.servicesUsed ?? [],
      features: project.features ?? [],
      businessResults: project.businessResults ?? [],
      statistics: project.statistics ?? [],
      testimonial: project.testimonial ?? undefined,
      gallery: project.gallery ?? [],
      featuredImage: project.featuredImage ?? undefined,
      bannerImage: project.bannerImage ?? undefined,
      links: project.links ?? {},
      content: project.content
        ? {
            format: project.content.format,
            html: project.content.html ?? '',
            plainText: project.content.plainText,
            document: project.content.document ?? null,
          }
        : undefined,
      tableOfContents: project.tableOfContents ?? [],
      projectType: project.projectType,
      industries: industries.map((item) => this.mapTaxonomyRef(item)!).filter(Boolean),
      primaryIndustry: this.mapTaxonomyRef(project.primaryIndustry as unknown as PopulatedRef),
      relatedServices: relatedServices.map((item) => this.mapServiceRef(item)),
      relatedBlogs: relatedBlogs.map((item) => this.mapBlogRef(item)),
      relatedPortfolio: relatedPortfolio.map((item) => this.mapPortfolioRef(item)),
      publicationStatus: project.publicationStatus,
      publishedAt: project.publishedAt?.toISOString(),
      scheduledPublishAt: project.scheduledPublishAt?.toISOString(),
      unpublishedAt: project.unpublishedAt?.toISOString(),
      isFeatured: project.isFeatured,
      isPinned: project.isPinned,
      displayOrder: project.displayOrder,
      viewCount: project.viewCount,
      completionDate: project.completionDate,
      teamSize: project.teamSize,
      budget: project.budget,
      legacyId: project.legacyId,
      duplicateOf: project.duplicateOf?.toString(),
      lastAutosavedAt: project.lastAutosavedAt?.toISOString(),
      metaTitle: project.metaTitle,
      metaDescription: project.metaDescription,
      canonical: project.canonical,
      openGraph: project.openGraph as Record<string, unknown> | undefined,
      twitterCard: project.twitterCard as Record<string, unknown> | undefined,
      schemaJson: project.schemaJson as Record<string, unknown> | undefined,
      robots: project.robots,
      indexable: project.indexable,
      breadcrumbs: project.breadcrumbs,
      metaKeywords: project.metaKeywords,
      canonicalUrl: project.canonicalUrl,
      robotsIndex: project.robotsIndex,
      robotsFollow: project.robotsFollow,
      seoScore: project.seoScore,
      creativeWorkSchema: project.creativeWorkSchema as Record<string, unknown> | undefined,
      organizationSchema: project.organizationSchema as Record<string, unknown> | undefined,
      breadcrumbSchema: project.breadcrumbSchema as Record<string, unknown> | undefined,
      imageObjectSchema: project.imageObjectSchema as Record<string, unknown> | undefined,
      includeInSitemap: project.includeInSitemap,
      isDeleted: project.isDeleted,
      deletedAt: project.deletedAt?.toISOString(),
      permanentlyDeletedAt: project.permanentlyDeletedAt?.toISOString(),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  private toPortfolioSummaryResponse(project: IPortfolioProject): PortfolioResponse {
    const response = this.toPortfolioResponse(project);
    return {
      ...response,
      fullDescription: response.fullDescription?.slice(0, 280),
      challenge: undefined,
      solution: undefined,
      gallery: response.gallery.slice(0, 1),
      content: response.content
        ? {
            format: response.content.format,
            html: '',
            document: null,
            plainText: response.content.plainText?.slice(0, 280) ?? '',
          }
        : undefined,
    };
  }

  private async getProjectOrThrow(id: string, includeDeleted = false): Promise<IPortfolioProject> {
    const project = await portfolioRepository.findById(id, includeDeleted);
    if (!project) throw new NotFoundError('Portfolio project');
    return project;
  }

  private async resolveSlug(title: string, slug?: string, excludeId?: string): Promise<string> {
    const base = slugify(slug || title);
    return ensureUniqueSlug(base, async (candidate) => portfolioRepository.slugExists(candidate, excludeId));
  }

  private buildContentPayload(content?: CreatePortfolioDto['content']) {
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

  private buildPortfolioData(
    dto: CreatePortfolioDto | UpdatePortfolioDto,
    actorId: string,
    existing?: IPortfolioProject,
  ): Record<string, unknown> {
    const content = dto.content !== undefined ? this.buildContentPayload(dto.content) : undefined;

    return {
      ...(dto.clientName !== undefined && { clientName: dto.clientName || undefined }),
      ...(dto.industryLabel !== undefined && { industryLabel: dto.industryLabel || undefined }),
      ...(dto.category !== undefined && { category: dto.category || undefined }),
      ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription || undefined }),
      ...(dto.fullDescription !== undefined && { fullDescription: dto.fullDescription || undefined }),
      ...(dto.challenge !== undefined && { challenge: dto.challenge || undefined }),
      ...(dto.solution !== undefined && { solution: dto.solution || undefined }),
      ...(dto.process !== undefined && { process: dto.process }),
      ...(dto.technologyStack !== undefined && { technologyStack: dto.technologyStack }),
      ...(dto.projectDuration !== undefined && { projectDuration: dto.projectDuration }),
      ...(dto.servicesUsed !== undefined && { servicesUsed: dto.servicesUsed }),
      ...(dto.features !== undefined && { features: dto.features }),
      ...(dto.businessResults !== undefined && { businessResults: dto.businessResults }),
      ...(dto.statistics !== undefined && { statistics: dto.statistics }),
      ...(dto.testimonial !== undefined && { testimonial: dto.testimonial }),
      ...(dto.gallery !== undefined && { gallery: dto.gallery }),
      ...(dto.featuredImage !== undefined && { featuredImage: dto.featuredImage }),
      ...(dto.bannerImage !== undefined && { bannerImage: dto.bannerImage }),
      ...(dto.links !== undefined && { links: dto.links }),
      ...(content && { content }),
      ...(dto.tableOfContents !== undefined && { tableOfContents: dto.tableOfContents }),
      ...(dto.projectType !== undefined && { projectType: dto.projectType }),
      ...(dto.industries !== undefined && { industries: dto.industries.map((id) => toObjectId(id)!) }),
      ...(dto.primaryIndustry !== undefined && {
        primaryIndustry: toObjectId(dto.primaryIndustry ?? undefined) ?? null,
      }),
      ...(dto.relatedServices !== undefined && {
        relatedServices: dto.relatedServices.map((id) => toObjectId(id)!),
      }),
      ...(dto.relatedBlogs !== undefined && { relatedBlogs: dto.relatedBlogs.map((id) => toObjectId(id)!) }),
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
      ...(dto.completionDate !== undefined && { completionDate: dto.completionDate }),
      ...(dto.teamSize !== undefined && { teamSize: dto.teamSize }),
      ...(dto.budget !== undefined && { budget: dto.budget }),
      ...(dto.legacyId !== undefined && { legacyId: dto.legacyId }),
      ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
      ...(dto.metaDescription !== undefined && { metaDescription: dto.metaDescription }),
      ...(dto.canonical !== undefined && { canonical: dto.canonical || undefined }),
      ...(dto.metaKeywords !== undefined && { metaKeywords: dto.metaKeywords }),
      ...(dto.canonicalUrl !== undefined && { canonicalUrl: dto.canonicalUrl || undefined }),
      ...(dto.robotsIndex !== undefined && { robotsIndex: dto.robotsIndex }),
      ...(dto.robotsFollow !== undefined && { robotsFollow: dto.robotsFollow }),
      ...(dto.creativeWorkSchema !== undefined && { creativeWorkSchema: dto.creativeWorkSchema }),
      ...(dto.organizationSchema !== undefined && { organizationSchema: dto.organizationSchema }),
      ...(dto.breadcrumbSchema !== undefined && { breadcrumbSchema: dto.breadcrumbSchema }),
      ...(dto.imageObjectSchema !== undefined && { imageObjectSchema: dto.imageObjectSchema }),
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

  private resolveSeoScore(dto: CreatePortfolioDto | UpdatePortfolioDto, existing?: IPortfolioProject): number {
    return calculateCmsSeoScore({
      title: dto.title ?? existing?.title ?? '',
      slug: dto.slug ?? existing?.slug,
      shortDescription: dto.shortDescription ?? existing?.shortDescription,
      metaTitle: dto.metaTitle ?? existing?.metaTitle,
      metaDescription: dto.metaDescription ?? existing?.metaDescription,
      metaKeywords: dto.metaKeywords ?? existing?.metaKeywords,
      canonicalUrl: dto.canonicalUrl ?? existing?.canonicalUrl,
      featuredImageUrl: (dto.featuredImage ?? existing?.featuredImage)?.url,
      robotsIndex: dto.robotsIndex ?? existing?.robotsIndex ?? true,
      includeInSitemap: dto.includeInSitemap ?? existing?.includeInSitemap ?? true,
    }).score;
  }

  async list(query: ListPortfolioQuery): Promise<{ projects: PortfolioResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);

    const [projects, total] = await Promise.all([
      portfolioRepository.findMany({
        skip,
        limit,
        sort,
        search: query.search,
        publicationStatus: query.publicationStatus,
        projectType: query.projectType,
        category: query.category,
        industry: query.industry,
        isFeatured: query.isFeatured,
        isPinned: query.isPinned,
        includeTrash: query.includeTrash,
        trashOnly: query.trashOnly,
      }),
      portfolioRepository.count({
        search: query.search,
        publicationStatus: query.publicationStatus,
        projectType: query.projectType,
        category: query.category,
        industry: query.industry,
        isFeatured: query.isFeatured,
        isPinned: query.isPinned,
        includeTrash: query.includeTrash,
        trashOnly: query.trashOnly,
      }),
    ]);

    return {
      projects: projects.map((project) => this.toPortfolioResponse(project)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async listPublished(
    query: ListPortfolioQuery,
  ): Promise<{ projects: PortfolioResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);
    const industry =
      query.industry ??
      (query.industrySlug ? await this.resolveIndustryIdBySlug(query.industrySlug) : undefined);

    const [projects, total] = await Promise.all([
      portfolioRepository.findMany({
        skip,
        limit,
        sort: sort.publishedAt ? sort : { displayOrder: 1, publishedAt: -1, isPinned: -1 },
        search: query.search,
        projectType: query.projectType,
        category: query.category,
        industry,
        isFeatured: query.isFeatured,
        isPinned: query.isPinned,
        publishedOnly: true,
        summaryOnly: true,
      }),
      portfolioRepository.count({
        search: query.search,
        projectType: query.projectType,
        category: query.category,
        industry,
        isFeatured: query.isFeatured,
        isPinned: query.isPinned,
        publishedOnly: true,
      }),
    ]);

    return {
      projects: projects.map((project) => this.toPortfolioSummaryResponse(project)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<PortfolioResponse> {
    return this.toPortfolioResponse(await this.getProjectOrThrow(id));
  }

  async getPublishedBySlug(slug: string): Promise<PortfolioResponse> {
    const project = await portfolioRepository.findBySlug(slug, true);
    if (!project) throw new NotFoundError('Portfolio project');

    void portfolioRepository.incrementViewCount(project.id);
    return this.toPortfolioResponse(project, true);
  }

  async getPublicFeeds(): Promise<PortfolioPublicFeedsResponse> {
    const projects = await portfolioRepository.findPublishedForFeeds();
    const sitemap: PortfolioSitemapEntry[] = [];

    projects.forEach((project) => {
      if (project.robotsIndex && project.includeInSitemap) {
        sitemap.push({
          slug: project.slug,
          updatedAt: project.updatedAt.toISOString(),
          publishedAt: project.publishedAt?.toISOString(),
        });
      }
    });

    return { sitemap };
  }

  async create(dto: CreatePortfolioDto, actorId: string): Promise<PortfolioResponse> {
    await this.validateReferences(dto);

    const slug = await this.resolveSlug(dto.title, dto.slug);
    const project = await portfolioRepository.create({
      ...this.buildPortfolioData(dto, actorId),
      title: dto.title,
      slug,
      projectType: dto.projectType ?? PortfolioProjectType.CASE_STUDY,
      industries: (dto.industries ?? []).map((id) => toObjectId(id)!),
      primaryIndustry: toObjectId(dto.primaryIndustry ?? undefined) ?? undefined,
      technologyStack: dto.technologyStack ?? [],
      process: dto.process ?? [],
      servicesUsed: dto.servicesUsed ?? [],
      features: dto.features ?? [],
      businessResults: dto.businessResults ?? [],
      statistics: dto.statistics ?? [],
      gallery: dto.gallery ?? [],
      tableOfContents: dto.tableOfContents ?? [],
      relatedServices: (dto.relatedServices ?? []).map((id) => toObjectId(id)!),
      relatedBlogs: (dto.relatedBlogs ?? []).map((id) => toObjectId(id)!),
      relatedPortfolio: (dto.relatedPortfolio ?? []).map((id) => toObjectId(id)!),
      links: dto.links ?? {},
      publicationStatus: dto.publicationStatus ?? CmsPublicationStatus.DRAFT,
      scheduledPublishAt: dto.scheduledPublishAt ? new Date(dto.scheduledPublishAt) : undefined,
      isFeatured: dto.isFeatured ?? false,
      isPinned: dto.isPinned ?? false,
      displayOrder: dto.displayOrder ?? 0,
      content: this.buildContentPayload(dto.content),
      seoScore: this.resolveSeoScore(dto),
      indexable: dto.indexable ?? true,
      robotsIndex: dto.robotsIndex ?? true,
      robotsFollow: dto.robotsFollow ?? true,
      includeInSitemap: dto.includeInSitemap ?? true,
      createdBy: toObjectId(actorId),
    } as Partial<IPortfolioProject>);

    loggers.admin.info('Portfolio project created', { projectId: project.id, actorId });
    return this.toPortfolioResponse(project);
  }

  async update(id: string, dto: UpdatePortfolioDto, actorId: string): Promise<PortfolioResponse> {
    const existing = await this.getProjectOrThrow(id);
    if (existing.isDeleted) {
      throw new BadRequestError('Cannot update a portfolio project in trash. Restore it first.');
    }

    await this.validateReferences(dto);

    const updateData = this.buildPortfolioData(dto, actorId, existing) as Partial<IPortfolioProject>;

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.slug || dto.title) {
      updateData.slug = await this.resolveSlug(dto.title ?? existing.title, dto.slug ?? existing.slug, id);
    }

    updateData.seoScore = this.resolveSeoScore(dto, existing);

    const updated = await portfolioRepository.updateById(id, updateData);
    if (!updated) throw new NotFoundError('Portfolio project');

    loggers.admin.info('Portfolio project updated', { projectId: id, actorId });
    if (updated.publicationStatus === CmsPublicationStatus.PUBLISHED) {
      revalidatePortfolioContent(updated.slug);
    }
    return this.toPortfolioResponse(updated);
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    const project = await this.getProjectOrThrow(id);
    if (project.isDeleted) throw new BadRequestError('Portfolio project is already in trash');
    await portfolioRepository.softDeleteById(id, actorId);
    loggers.admin.info('Portfolio project moved to trash', { projectId: id, actorId });
    if (project.publicationStatus === CmsPublicationStatus.PUBLISHED) {
      revalidatePortfolioContent(project.slug);
    }
  }

  async permanentDelete(id: string, actorId: string): Promise<void> {
    await this.getProjectOrThrow(id, true);
    await portfolioRepository.permanentDeleteById(id);
    loggers.admin.info('Portfolio project permanently deleted', { projectId: id, actorId });
    revalidatePortfolioContent();
  }

  async restore(id: string, actorId: string): Promise<PortfolioResponse> {
    const project = await this.getProjectOrThrow(id, true);
    if (!project.isDeleted) throw new BadRequestError('Portfolio project is not in trash');

    const restored = await portfolioRepository.restoreById(id, actorId);
    if (!restored) throw new NotFoundError('Portfolio project');

    if (restored.publicationStatus === CmsPublicationStatus.PUBLISHED) {
      revalidatePortfolioContent(restored.slug);
    }
    return this.toPortfolioResponse(restored);
  }

  async publish(id: string, actorId: string): Promise<PortfolioResponse> {
    const project = await this.getProjectOrThrow(id);
    if (project.isDeleted) throw new BadRequestError('Cannot publish a portfolio project in trash');

    const updated = await portfolioRepository.updateById(id, {
      publicationStatus: CmsPublicationStatus.PUBLISHED,
      publishedAt: new Date(),
      scheduledPublishAt: null,
      unpublishedAt: null,
      updatedBy: actorId,
    });

    if (!updated) throw new NotFoundError('Portfolio project');
    revalidatePortfolioContent(updated.slug);
    return this.toPortfolioResponse(updated);
  }

  async unpublish(id: string, actorId: string): Promise<PortfolioResponse> {
    await this.getProjectOrThrow(id);

    const updated = await portfolioRepository.updateById(id, {
      publicationStatus: CmsPublicationStatus.DRAFT,
      unpublishedAt: new Date(),
      updatedBy: actorId,
    });

    if (!updated) throw new NotFoundError('Portfolio project');
    revalidatePortfolioContent(updated.slug);
    return this.toPortfolioResponse(updated);
  }

  async schedule(id: string, dto: SchedulePortfolioDto, actorId: string): Promise<PortfolioResponse> {
    const project = await this.getProjectOrThrow(id);
    if (project.isDeleted) throw new BadRequestError('Cannot schedule a portfolio project in trash');

    const scheduledAt = new Date(dto.scheduledPublishAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestError('Scheduled publish time must be in the future');
    }

    const updated = await portfolioRepository.updateById(id, {
      publicationStatus: CmsPublicationStatus.SCHEDULED,
      scheduledPublishAt: scheduledAt,
      updatedBy: actorId,
    });

    if (!updated) throw new NotFoundError('Portfolio project');
    return this.toPortfolioResponse(updated);
  }

  async archive(id: string, actorId: string): Promise<PortfolioResponse> {
    await this.getProjectOrThrow(id);

    const updated = await portfolioRepository.updateById(id, {
      publicationStatus: CmsPublicationStatus.ARCHIVED,
      updatedBy: actorId,
    });

    if (!updated) throw new NotFoundError('Portfolio project');
    return this.toPortfolioResponse(updated);
  }

  async duplicate(id: string, actorId: string): Promise<PortfolioResponse> {
    const source = await this.getProjectOrThrow(id);
    const slug = await this.resolveSlug(`${source.slug}-copy`);

    const duplicate = await portfolioRepository.create({
      title: `${source.title} (Copy)`,
      slug,
      clientName: source.clientName,
      industryLabel: source.industryLabel,
      category: source.category,
      shortDescription: source.shortDescription,
      fullDescription: source.fullDescription,
      challenge: source.challenge,
      solution: source.solution,
      process: source.process,
      technologyStack: source.technologyStack,
      projectDuration: source.projectDuration,
      servicesUsed: source.servicesUsed,
      features: source.features,
      businessResults: source.businessResults,
      statistics: source.statistics,
      testimonial: source.testimonial,
      gallery: source.gallery,
      featuredImage: source.featuredImage,
      bannerImage: source.bannerImage,
      links: source.links,
      content: source.content,
      tableOfContents: source.tableOfContents,
      projectType: source.projectType,
      industries: source.industries,
      primaryIndustry: source.primaryIndustry,
      relatedServices: source.relatedServices,
      relatedBlogs: source.relatedBlogs,
      relatedPortfolio: source.relatedPortfolio,
      publicationStatus: CmsPublicationStatus.DRAFT,
      isFeatured: false,
      isPinned: false,
      displayOrder: source.displayOrder,
      completionDate: source.completionDate,
      teamSize: source.teamSize,
      budget: source.budget,
      metaTitle: source.metaTitle,
      metaDescription: source.metaDescription,
      canonical: source.canonical,
      metaKeywords: source.metaKeywords,
      canonicalUrl: source.canonicalUrl,
      robotsIndex: source.robotsIndex,
      robotsFollow: source.robotsFollow,
      seoScore: source.seoScore,
      creativeWorkSchema: source.creativeWorkSchema,
      organizationSchema: source.organizationSchema,
      breadcrumbSchema: source.breadcrumbSchema,
      imageObjectSchema: source.imageObjectSchema,
      includeInSitemap: source.includeInSitemap,
      duplicateOf: source._id,
      createdBy: toObjectId(actorId),
      updatedBy: toObjectId(actorId),
    } as Partial<IPortfolioProject>);

    return this.toPortfolioResponse(duplicate);
  }

  async bulkAction(dto: PortfolioBulkActionDto, actorId: string): Promise<{ affected: number }> {
    let affected = 0;

    switch (dto.action) {
      case 'delete':
        affected = await portfolioRepository.bulkSoftDelete(dto.ids, actorId);
        break;
      case 'publish':
        affected = await portfolioRepository.bulkUpdateStatus(
          dto.ids,
          CmsPublicationStatus.PUBLISHED,
          actorId,
          { publishedAt: new Date(), scheduledPublishAt: null, unpublishedAt: null },
        );
        break;
      case 'archive':
        affected = await portfolioRepository.bulkUpdateStatus(
          dto.ids,
          CmsPublicationStatus.ARCHIVED,
          actorId,
        );
        break;
      case 'restore':
        affected = await portfolioRepository.bulkRestore(dto.ids, actorId);
        break;
      default:
        throw new BadRequestError('Unsupported bulk action');
    }

    if (affected > 0 && ['publish', 'delete', 'archive', 'restore'].includes(dto.action)) {
      revalidatePortfolioContent();
    }
    return { affected };
  }
}

export const portfolioService = new PortfolioService();
