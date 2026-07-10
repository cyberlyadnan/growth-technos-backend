import { Types } from 'mongoose';
import {
  BlogContentFormat,
  BlogDifficultyLevel,
  BlogPublicationStatus,
} from '@core/constants';
import { BadRequestError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import { calculateReadingTimeMinutes, stripHtml } from '@core/utils/reading-time';
import { calculateBlogSeoScore } from '@core/utils/blog-seo-score';
import { sanitizeBlogHtml } from '@core/utils/sanitize-html';
import { ensureUniqueSlug, slugify } from '@core/utils/slug';
import { Author } from '@modules/authors/model/author.model';
import { Category } from '@modules/categories/model/category.model';
import { Industry } from '@modules/industries/model/industry.model';
import { Tag } from '@modules/tags/model/tag.model';
import { TopicCluster } from '@modules/topic-clusters/model/topic-cluster.model';
import { IBlog } from '../model/blog.model';
import { blogRepository, toObjectId } from '../repository/blog.repository';
import {
  AutosaveBlogDto,
  BlogBulkActionDto,
  BlogPublicFeedsResponse,
  BlogResponse,
  BlogRssEntry,
  BlogSitemapEntry,
  CreateBlogDto,
  ListBlogsQuery,
  ScheduleBlogDto,
  UpdateBlogDto,
} from '../types/blog.types';

type PopulatedRef = {
  id?: string;
  _id?: { toString(): string };
  name: string;
  slug: string;
  color?: string;
  photo?: string;
  designation?: string;
  icon?: string;
};

function refId(doc: PopulatedRef | undefined | null): string | undefined {
  if (!doc) return undefined;
  return doc.id ?? doc._id?.toString();
}

function mapTaxonomyRef(doc: PopulatedRef | undefined | null) {
  if (!doc) return undefined;
  return {
    id: refId(doc)!,
    name: doc.name,
    slug: doc.slug,
  };
}

function mapTagRef(doc: PopulatedRef) {
  return {
    id: refId(doc)!,
    name: doc.name,
    slug: doc.slug,
    color: doc.color,
  };
}

function mapAuthorRef(doc: PopulatedRef | undefined | null) {
  if (!doc) return undefined;
  return {
    id: refId(doc)!,
    name: doc.name,
    slug: doc.slug,
    photo: doc.photo,
    designation: doc.designation,
  };
}

function mapIndustryRef(doc: PopulatedRef | undefined | null) {
  if (!doc) return undefined;
  return {
    id: refId(doc)!,
    name: doc.name,
    slug: doc.slug,
    icon: doc.icon,
  };
}

export class BlogService {
  private readonly noMatchObjectId = new Types.ObjectId().toString();

  private async resolveCategoryIdBySlug(slug?: string): Promise<string | undefined> {
    if (!slug) return undefined;

    const doc = await Category.findOne({
      slug: slug.toLowerCase(),
      isDeleted: { $ne: true },
      isActive: true,
    })
      .select('_id')
      .lean();

    if (!doc?._id) return this.noMatchObjectId;
    return doc._id.toString();
  }

  private async resolveTagIdBySlug(slug?: string): Promise<string | undefined> {
    if (!slug) return undefined;

    const doc = await Tag.findOne({
      slug: slug.toLowerCase(),
      isDeleted: { $ne: true },
      isActive: true,
    })
      .select('_id')
      .lean();

    if (!doc?._id) return this.noMatchObjectId;
    return doc._id.toString();
  }

  private async resolveAuthorIdBySlug(slug?: string): Promise<string | undefined> {
    if (!slug) return undefined;

    const doc = await Author.findOne({
      slug: slug.toLowerCase(),
      isDeleted: { $ne: true },
      isActive: true,
    })
      .select('_id')
      .lean();

    if (!doc?._id) return this.noMatchObjectId;
    return doc._id.toString();
  }

  private async resolvePublicBlogFilters(query: ListBlogsQuery) {
    const [category, tag, author] = await Promise.all([
      query.category
        ? Promise.resolve(query.category)
        : this.resolveCategoryIdBySlug(query.categorySlug),
      query.tag ? Promise.resolve(query.tag) : this.resolveTagIdBySlug(query.tagSlug),
      query.author
        ? Promise.resolve(query.author)
        : this.resolveAuthorIdBySlug(query.authorSlug),
    ]);

    return { category, tag, author };
  }

  private toBlogSummaryResponse(blog: IBlog): BlogResponse {
    const response = this.toBlogResponse(blog);

    return {
      ...response,
      content: {
        format: response.content.format,
        document: {},
        html: '',
        plainText: response.content.plainText?.slice(0, 280) ?? '',
      },
      tableOfContents: [],
    };
  }

  private toBlogResponse(blog: IBlog): BlogResponse {
    const category = blog.category as unknown as PopulatedRef | undefined;
    const tags = (blog.tags as unknown as PopulatedRef[]) ?? [];
    const author = blog.author as unknown as PopulatedRef;
    const topicCluster = blog.topicCluster as unknown as PopulatedRef | undefined;
    const industry = blog.industry as unknown as PopulatedRef | undefined;

    return {
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      summary: blog.summary,
      featuredImage: blog.featuredImage ?? undefined,
      thumbnail: blog.thumbnail ?? undefined,
      bannerImage: blog.bannerImage ?? undefined,
      content: {
        format: blog.content.format,
        document: blog.content.document ?? {},
        html: blog.content.html ?? '',
        plainText: blog.content.plainText,
      },
      category: mapTaxonomyRef(category),
      tags: tags.map(mapTagRef),
      topicCluster: mapTaxonomyRef(topicCluster),
      industry: mapIndustryRef(industry),
      author: mapAuthorRef(author)!,
      readingTimeMinutes: blog.readingTimeMinutes,
      difficultyLevel: blog.difficultyLevel,
      publicationStatus: blog.publicationStatus,
      publishedAt: blog.publishedAt?.toISOString(),
      scheduledPublishAt: blog.scheduledPublishAt?.toISOString(),
      unpublishedAt: blog.unpublishedAt?.toISOString(),
      isFeatured: blog.isFeatured,
      isPinned: blog.isPinned,
      isTrending: blog.isTrending,
      allowComments: blog.allowComments,
      viewCount: blog.viewCount,
      likeCount: blog.likeCount,
      tableOfContents: blog.tableOfContents ?? [],
      duplicateOf: blog.duplicateOf?.toString(),
      lastAutosavedAt: blog.lastAutosavedAt?.toISOString(),
      metaTitle: blog.metaTitle,
      metaDescription: blog.metaDescription,
      canonical: blog.canonical,
      metaKeywords: blog.metaKeywords,
      canonicalUrl: blog.canonicalUrl,
      robotsIndex: blog.robotsIndex,
      robotsFollow: blog.robotsFollow,
      seoScore: blog.seoScore,
      includeInSitemap: blog.includeInSitemap,
      includeInRss: blog.includeInRss,
      isDeleted: blog.isDeleted,
      deletedAt: blog.deletedAt?.toISOString(),
      permanentlyDeletedAt: blog.permanentlyDeletedAt?.toISOString(),
      createdAt: blog.createdAt.toISOString(),
      updatedAt: blog.updatedAt.toISOString(),
    };
  }

  private async getBlogOrThrow(id: string, includeDeleted = false): Promise<IBlog> {
    const blog = await blogRepository.findById(id, includeDeleted);
    if (!blog) throw new NotFoundError('Blog');
    return blog;
  }

  private async resolveSlug(title: string, slug?: string, excludeId?: string): Promise<string> {
    const base = slugify(slug || title);
    return ensureUniqueSlug(base, async (candidate) =>
      blogRepository.slugExists(candidate, excludeId),
    );
  }

  private async validateReferences(dto: {
    author?: string;
    category?: string | null;
    tags?: string[];
    topicCluster?: string | null;
    industry?: string | null;
  }): Promise<void> {
    if (dto.author) {
      const author = await Author.findById(dto.author).exec();
      if (!author) throw new BadRequestError('Author not found');
    }

    if (dto.category) {
      const category = await Category.findById(dto.category).exec();
      if (!category) throw new BadRequestError('Category not found');
    }

    if (dto.topicCluster) {
      const cluster = await TopicCluster.findById(dto.topicCluster).exec();
      if (!cluster) throw new BadRequestError('Topic cluster not found');
    }

    if (dto.industry) {
      const industry = await Industry.findById(dto.industry).exec();
      if (!industry) throw new BadRequestError('Industry not found');
    }

    if (dto.tags?.length) {
      const count = await Tag.countDocuments({ _id: { $in: dto.tags } });
      if (count !== dto.tags.length) throw new BadRequestError('One or more tags not found');
    }
  }

  private buildContentPayload(content?: CreateBlogDto['content']) {
    const rawHtml = content?.html ?? '';
    const html = sanitizeBlogHtml(rawHtml);
    const plainText = content?.plainText?.trim() || stripHtml(html);

    return {
      format: content?.format ?? BlogContentFormat.TIPTAP,
      document: content?.document ?? {},
      html,
      plainText,
    };
  }

  private buildBlogData(
    dto: CreateBlogDto | UpdateBlogDto,
    actorId: string,
    existing?: IBlog,
  ): Record<string, unknown> {
    const content = dto.content !== undefined ? this.buildContentPayload(dto.content) : undefined;
    const plainText = content?.plainText ?? existing?.content.plainText ?? '';

    return {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.excerpt !== undefined && { excerpt: dto.excerpt || undefined }),
      ...(dto.summary !== undefined && { summary: dto.summary || undefined }),
      ...(dto.featuredImage !== undefined && { featuredImage: dto.featuredImage }),
      ...(dto.thumbnail !== undefined && { thumbnail: dto.thumbnail }),
      ...(dto.bannerImage !== undefined && { bannerImage: dto.bannerImage }),
      ...(content && { content }),
      ...(content && { readingTimeMinutes: calculateReadingTimeMinutes(plainText) }),
      ...(dto.category !== undefined && { category: toObjectId(dto.category ?? undefined) ?? null }),
      ...(dto.tags !== undefined && { tags: dto.tags.map((id) => toObjectId(id)!) }),
      ...(dto.topicCluster !== undefined && {
        topicCluster: toObjectId(dto.topicCluster ?? undefined) ?? null,
      }),
      ...(dto.industry !== undefined && { industry: toObjectId(dto.industry ?? undefined) ?? null }),
      ...(dto.author !== undefined && { author: toObjectId(dto.author) }),
      ...(dto.difficultyLevel !== undefined && { difficultyLevel: dto.difficultyLevel }),
      ...(dto.publicationStatus !== undefined && { publicationStatus: dto.publicationStatus }),
      ...(dto.scheduledPublishAt !== undefined && {
        scheduledPublishAt: dto.scheduledPublishAt ? new Date(dto.scheduledPublishAt) : null,
      }),
      ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
      ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
      ...(dto.isTrending !== undefined && { isTrending: dto.isTrending }),
      ...(dto.allowComments !== undefined && { allowComments: dto.allowComments }),
      ...(dto.tableOfContents !== undefined && { tableOfContents: dto.tableOfContents }),
      ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
      ...(dto.metaDescription !== undefined && { metaDescription: dto.metaDescription }),
      ...(dto.canonical !== undefined && { canonical: dto.canonical || undefined }),
      ...(dto.metaKeywords !== undefined && { metaKeywords: dto.metaKeywords }),
      ...(dto.canonicalUrl !== undefined && { canonicalUrl: dto.canonicalUrl || undefined }),
      ...(dto.robotsIndex !== undefined && { robotsIndex: dto.robotsIndex }),
      ...(dto.robotsFollow !== undefined && { robotsFollow: dto.robotsFollow }),
      ...(dto.seoScore !== undefined && { seoScore: dto.seoScore }),
      ...(dto.includeInSitemap !== undefined && { includeInSitemap: dto.includeInSitemap }),
      ...(dto.includeInRss !== undefined && { includeInRss: dto.includeInRss }),
      updatedBy: actorId,
    };
  }

  private resolveSeoScore(
    dto: CreateBlogDto | UpdateBlogDto,
    existing?: IBlog,
  ): number {
    const mergedContent =
      dto.content !== undefined ? this.buildContentPayload(dto.content) : existing?.content;

    return calculateBlogSeoScore({
      title: dto.title ?? existing?.title ?? '',
      slug: dto.slug ?? existing?.slug,
      excerpt: dto.excerpt ?? existing?.excerpt,
      metaTitle: dto.metaTitle ?? existing?.metaTitle,
      metaDescription: dto.metaDescription ?? existing?.metaDescription,
      metaKeywords: dto.metaKeywords ?? existing?.metaKeywords,
      canonicalUrl: dto.canonicalUrl ?? existing?.canonicalUrl,
      featuredImageUrl: (dto.featuredImage ?? existing?.featuredImage)?.url,
      plainText: mergedContent?.plainText ?? existing?.content.plainText,
      tableOfContentsCount: (dto.tableOfContents ?? existing?.tableOfContents)?.length ?? 0,
      robotsIndex: dto.robotsIndex ?? existing?.robotsIndex ?? true,
      includeInSitemap: dto.includeInSitemap ?? existing?.includeInSitemap ?? true,
    }).score;
  }

  async list(
    query: ListBlogsQuery,
  ): Promise<{ blogs: BlogResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);

    const [blogs, total] = await Promise.all([
      blogRepository.findMany({
        skip,
        limit,
        sort,
        search: query.search,
        publicationStatus: query.publicationStatus,
        category: query.category,
        tag: query.tag,
        author: query.author,
        industry: query.industry,
        topicCluster: query.topicCluster,
        isFeatured: query.isFeatured,
        isPinned: query.isPinned,
        isTrending: query.isTrending,
        difficultyLevel: query.difficultyLevel,
        includeTrash: query.includeTrash,
        trashOnly: query.trashOnly,
      }),
      blogRepository.count({
        search: query.search,
        publicationStatus: query.publicationStatus,
        category: query.category,
        tag: query.tag,
        author: query.author,
        industry: query.industry,
        topicCluster: query.topicCluster,
        isFeatured: query.isFeatured,
        isPinned: query.isPinned,
        isTrending: query.isTrending,
        difficultyLevel: query.difficultyLevel,
        includeTrash: query.includeTrash,
        trashOnly: query.trashOnly,
      }),
    ]);

    return {
      blogs: blogs.map((blog) => this.toBlogResponse(blog)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async listPublished(
    query: ListBlogsQuery,
  ): Promise<{ blogs: BlogResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);
    const { category, tag, author } = await this.resolvePublicBlogFilters(query);

    const [blogs, total] = await Promise.all([
      blogRepository.findMany({
        skip,
        limit,
        sort: sort.publishedAt ? sort : { publishedAt: -1, isPinned: -1 },
        search: query.search,
        category,
        tag,
        author,
        industry: query.industry,
        topicCluster: query.topicCluster,
        isFeatured: query.isFeatured,
        isTrending: query.isTrending,
        publishedOnly: true,
        summaryOnly: true,
      }),
      blogRepository.count({
        search: query.search,
        category,
        tag,
        author,
        industry: query.industry,
        topicCluster: query.topicCluster,
        isFeatured: query.isFeatured,
        isTrending: query.isTrending,
        publishedOnly: true,
      }),
    ]);

    return {
      blogs: blogs.map((blog) => this.toBlogSummaryResponse(blog)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<BlogResponse> {
    const blog = await this.getBlogOrThrow(id);
    return this.toBlogResponse(blog);
  }

  async getPublishedBySlug(slug: string): Promise<BlogResponse> {
    const blog = await blogRepository.findBySlug(slug, true);
    if (!blog) throw new NotFoundError('Blog');

    await blogRepository.incrementViewCount(blog.id);
    return this.toBlogResponse(blog);
  }

  async getPublicFeeds(): Promise<BlogPublicFeedsResponse> {
    const blogs = await blogRepository.findPublishedForFeeds();

    const sitemap: BlogSitemapEntry[] = [];
    const rss: BlogRssEntry[] = [];

    blogs.forEach((blog) => {
      const author = blog.author as unknown as PopulatedRef | undefined;
      const category = blog.category as unknown as PopulatedRef | undefined;
      const updatedAt = blog.updatedAt.toISOString();
      const publishedAt = blog.publishedAt?.toISOString();

      if (blog.robotsIndex && blog.includeInSitemap) {
        sitemap.push({
          slug: blog.slug,
          updatedAt,
          publishedAt,
        });
      }

      if (blog.includeInRss) {
        rss.push({
          slug: blog.slug,
          title: blog.metaTitle ?? blog.title,
          description: blog.metaDescription ?? blog.excerpt ?? blog.summary ?? blog.title,
          authorName: author?.name ?? 'Growth Technos',
          categoryName: category?.name,
          publishedAt,
          updatedAt,
          imageUrl: blog.featuredImage?.url,
        });
      }
    });

    return { sitemap, rss };
  }

  async create(dto: CreateBlogDto, actorId: string): Promise<BlogResponse> {
    await this.validateReferences(dto);

    const slug = await this.resolveSlug(dto.title, dto.slug);
    const content = this.buildContentPayload(dto.content);

    const blog = await blogRepository.create({
      ...this.buildBlogData(dto, actorId),
      title: dto.title,
      slug,
      author: toObjectId(dto.author)!,
      content,
      readingTimeMinutes: calculateReadingTimeMinutes(content.plainText),
      difficultyLevel: dto.difficultyLevel ?? BlogDifficultyLevel.INTERMEDIATE,
      publicationStatus: dto.publicationStatus ?? BlogPublicationStatus.DRAFT,
      tags: (dto.tags ?? []).map((id) => toObjectId(id)!),
      category: toObjectId(dto.category ?? undefined) ?? undefined,
      topicCluster: toObjectId(dto.topicCluster ?? undefined) ?? undefined,
      industry: toObjectId(dto.industry ?? undefined) ?? undefined,
      scheduledPublishAt: dto.scheduledPublishAt ? new Date(dto.scheduledPublishAt) : undefined,
      isFeatured: dto.isFeatured ?? false,
      isPinned: dto.isPinned ?? false,
      isTrending: dto.isTrending ?? false,
      allowComments: dto.allowComments ?? true,
      tableOfContents: dto.tableOfContents ?? [],
      seoScore: this.resolveSeoScore(dto),
      createdBy: toObjectId(actorId),
    } as Partial<IBlog>);

    loggers.admin.info('Blog created', { blogId: blog.id, actorId });
    return this.toBlogResponse(blog);
  }

  async update(id: string, dto: UpdateBlogDto, actorId: string): Promise<BlogResponse> {
    const existing = await this.getBlogOrThrow(id);
    if (existing.isDeleted) {
      throw new BadRequestError('Cannot update a blog in trash. Restore it first.');
    }

    await this.validateReferences(dto);

    const updateData = this.buildBlogData(dto, actorId, existing) as Partial<IBlog>;

    if (dto.slug || dto.title) {
      updateData.slug = await this.resolveSlug(
        dto.title ?? existing.title,
        dto.slug ?? existing.slug,
        id,
      );
    }

    updateData.seoScore = this.resolveSeoScore(dto, existing);

    const updated = await blogRepository.updateById(id, updateData);
    if (!updated) throw new NotFoundError('Blog');

    loggers.admin.info('Blog updated', { blogId: id, actorId });
    return this.toBlogResponse(updated);
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    const blog = await this.getBlogOrThrow(id);
    if (blog.isDeleted) throw new BadRequestError('Blog is already in trash');

    await blogRepository.softDeleteById(id, actorId);
    loggers.admin.info('Blog moved to trash', { blogId: id, actorId });
  }

  async permanentDelete(id: string, actorId: string): Promise<void> {
    await this.getBlogOrThrow(id, true);
    await blogRepository.permanentDeleteById(id);
    loggers.admin.info('Blog permanently deleted', { blogId: id, actorId });
  }

  async restore(id: string, actorId: string): Promise<BlogResponse> {
    const blog = await this.getBlogOrThrow(id, true);
    if (!blog.isDeleted) throw new BadRequestError('Blog is not in trash');

    const restored = await blogRepository.restoreById(id, actorId);
    if (!restored) throw new NotFoundError('Blog');

    loggers.admin.info('Blog restored from trash', { blogId: id, actorId });
    return this.toBlogResponse(restored);
  }

  async publish(id: string, actorId: string): Promise<BlogResponse> {
    const blog = await this.getBlogOrThrow(id);
    if (blog.isDeleted) throw new BadRequestError('Cannot publish a blog in trash');

    await blogRepository.createRevision(id, blog.toObject() as Record<string, unknown>, actorId);

    const updated = await blogRepository.updateById(id, {
      publicationStatus: BlogPublicationStatus.PUBLISHED,
      publishedAt: new Date(),
      scheduledPublishAt: null,
      unpublishedAt: null,
      updatedBy: actorId,
    });

    if (!updated) throw new NotFoundError('Blog');
    loggers.admin.info('Blog published', { blogId: id, actorId });
    return this.toBlogResponse(updated);
  }

  async unpublish(id: string, actorId: string): Promise<BlogResponse> {
    await this.getBlogOrThrow(id);

    const updated = await blogRepository.updateById(id, {
      publicationStatus: BlogPublicationStatus.DRAFT,
      unpublishedAt: new Date(),
      updatedBy: actorId,
    });

    if (!updated) throw new NotFoundError('Blog');
    loggers.admin.info('Blog unpublished', { blogId: id, actorId });
    return this.toBlogResponse(updated);
  }

  async schedule(id: string, dto: ScheduleBlogDto, actorId: string): Promise<BlogResponse> {
    const blog = await this.getBlogOrThrow(id);
    if (blog.isDeleted) throw new BadRequestError('Cannot schedule a blog in trash');

    const scheduledAt = new Date(dto.scheduledPublishAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestError('Scheduled publish time must be in the future');
    }

    const updated = await blogRepository.updateById(id, {
      publicationStatus: BlogPublicationStatus.SCHEDULED,
      scheduledPublishAt: scheduledAt,
      updatedBy: actorId,
    });

    if (!updated) throw new NotFoundError('Blog');
    loggers.admin.info('Blog scheduled', { blogId: id, actorId, scheduledAt });
    return this.toBlogResponse(updated);
  }

  async archive(id: string, actorId: string): Promise<BlogResponse> {
    await this.getBlogOrThrow(id);

    const updated = await blogRepository.updateById(id, {
      publicationStatus: BlogPublicationStatus.ARCHIVED,
      updatedBy: actorId,
    });

    if (!updated) throw new NotFoundError('Blog');
    loggers.admin.info('Blog archived', { blogId: id, actorId });
    return this.toBlogResponse(updated);
  }

  async duplicate(id: string, actorId: string): Promise<BlogResponse> {
    const source = await this.getBlogOrThrow(id);

    const slug = await this.resolveSlug(`${source.slug}-copy`);
    const duplicate = await blogRepository.create({
      title: `${source.title} (Copy)`,
      slug,
      excerpt: source.excerpt,
      summary: source.summary,
      featuredImage: source.featuredImage,
      thumbnail: source.thumbnail,
      bannerImage: source.bannerImage,
      content: source.content,
      category: source.category,
      tags: source.tags,
      topicCluster: source.topicCluster,
      industry: source.industry,
      author: source.author,
      readingTimeMinutes: source.readingTimeMinutes,
      difficultyLevel: source.difficultyLevel,
      publicationStatus: BlogPublicationStatus.DRAFT,
      isFeatured: false,
      isPinned: false,
      isTrending: false,
      allowComments: source.allowComments,
      tableOfContents: source.tableOfContents,
      metaTitle: source.metaTitle,
      metaDescription: source.metaDescription,
      canonical: source.canonical,
      metaKeywords: source.metaKeywords,
      canonicalUrl: source.canonicalUrl,
      robotsIndex: source.robotsIndex,
      robotsFollow: source.robotsFollow,
      seoScore: source.seoScore,
      includeInSitemap: source.includeInSitemap,
      includeInRss: source.includeInRss,
      duplicateOf: source._id,
      createdBy: toObjectId(actorId),
      updatedBy: toObjectId(actorId),
    } as Partial<IBlog>);

    loggers.admin.info('Blog duplicated', { blogId: id, duplicateId: duplicate.id, actorId });
    return this.toBlogResponse(duplicate);
  }

  async autosave(id: string, dto: AutosaveBlogDto, actorId: string): Promise<{ savedAt: string }> {
    await this.getBlogOrThrow(id);

    if (dto.author || dto.category || dto.tags || dto.topicCluster || dto.industry) {
      await this.validateReferences({
        author: dto.author,
        category: dto.category,
        tags: dto.tags,
        topicCluster: dto.topicCluster,
        industry: dto.industry,
      });
    }

    const savedAt = new Date();
    await blogRepository.upsertAutosave(id, actorId, {
      title: dto.title,
      excerpt: dto.excerpt,
      summary: dto.summary,
      content: dto.content ? this.buildContentPayload(dto.content) : undefined,
      featuredImage: dto.featuredImage ?? undefined,
      thumbnail: dto.thumbnail ?? undefined,
      bannerImage: dto.bannerImage ?? undefined,
      category: toObjectId(dto.category ?? undefined),
      tags: dto.tags?.map((tagId) => toObjectId(tagId)!) ?? [],
      topicCluster: toObjectId(dto.topicCluster ?? undefined),
      industry: toObjectId(dto.industry ?? undefined),
      author: toObjectId(dto.author ?? undefined),
      seo: dto.seo,
    });

    await blogRepository.updateById(id, {
      lastAutosavedAt: savedAt,
      updatedBy: actorId,
    });

    return { savedAt: savedAt.toISOString() };
  }

  async bulkAction(dto: BlogBulkActionDto, actorId: string): Promise<{ affected: number }> {
    let affected = 0;

    switch (dto.action) {
      case 'delete':
        affected = await blogRepository.bulkSoftDelete(dto.ids, actorId);
        break;
      case 'publish':
        affected = await blogRepository.bulkUpdateStatus(
          dto.ids,
          BlogPublicationStatus.PUBLISHED,
          actorId,
          { publishedAt: new Date(), scheduledPublishAt: null, unpublishedAt: null },
        );
        break;
      case 'archive':
        affected = await blogRepository.bulkUpdateStatus(
          dto.ids,
          BlogPublicationStatus.ARCHIVED,
          actorId,
        );
        break;
      case 'restore':
        affected = await blogRepository.bulkRestore(dto.ids, actorId);
        break;
      default:
        throw new BadRequestError('Unsupported bulk action');
    }

    loggers.admin.info('Blog bulk action', { action: dto.action, count: affected, actorId });
    return { affected };
  }
}

export const blogService = new BlogService();
