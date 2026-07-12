import { UpdateQuery, Types } from 'mongoose';
import { BlogPublicationStatus } from '@core/constants';
import { buildSearchFilter } from '@core/pagination/pagination';
import {
  Blog,
  BlogAutosave,
  BlogRevision,
  IBlog,
  IBlogAutosave,
} from '../model/blog.model';

export const BLOG_POPULATE = [
  { path: 'category', select: 'name slug' },
  { path: 'tags', select: 'name slug color' },
  { path: 'author', select: 'name slug photo designation' },
  { path: 'topicCluster', select: 'name slug' },
  { path: 'industry', select: 'name slug icon' },
  {
    path: 'relatedServices',
    select: 'title slug kind publicationStatus isDeleted',
  },
  {
    path: 'relatedBlogs',
    select: 'title slug publicationStatus isDeleted',
  },
  {
    path: 'relatedPortfolio',
    select: 'title slug projectType publicationStatus isDeleted',
  },
];

export interface FindBlogsOptions {
  skip: number;
  limit: number;
  sort: Record<string, 1 | -1>;
  search?: string;
  publicationStatus?: BlogPublicationStatus;
  category?: string;
  tag?: string;
  author?: string;
  industry?: string;
  topicCluster?: string;
  isFeatured?: boolean;
  isPinned?: boolean;
  isTrending?: boolean;
  difficultyLevel?: string;
  includeTrash?: boolean;
  trashOnly?: boolean;
  publishedOnly?: boolean;
  summaryOnly?: boolean;
}

export class BlogRepository {
  private buildFilter(options: Omit<FindBlogsOptions, 'skip' | 'limit' | 'sort'>): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      ...buildSearchFilter(options.search, ['title', 'excerpt', 'summary', 'slug']),
    };

    if (options.trashOnly) {
      filter.isDeleted = true;
    } else if (!options.includeTrash) {
      filter.isDeleted = { $ne: true };
    }

    if (options.publishedOnly) {
      filter.publicationStatus = BlogPublicationStatus.PUBLISHED;
      filter.isDeleted = { $ne: true };
    } else if (options.publicationStatus) {
      filter.publicationStatus = options.publicationStatus;
    }

    if (options.category) filter.category = options.category;
    if (options.tag) filter.tags = options.tag;
    if (options.author) filter.author = options.author;
    if (options.industry) filter.industry = options.industry;
    if (options.topicCluster) filter.topicCluster = options.topicCluster;
    if (options.isFeatured !== undefined) filter.isFeatured = options.isFeatured;
    if (options.isPinned !== undefined) filter.isPinned = options.isPinned;
    if (options.isTrending !== undefined) filter.isTrending = options.isTrending;
    if (options.difficultyLevel) filter.difficultyLevel = options.difficultyLevel;

    return filter;
  }

  async findMany(options: FindBlogsOptions): Promise<IBlog[]> {
    const filter = this.buildFilter(options);
    const query = Blog.find(filter)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .populate(BLOG_POPULATE);

    if (options.summaryOnly) {
      query.select('-content.document -content.html -tableOfContents');
    }

    if (options.trashOnly || options.includeTrash) {
      query.setOptions({ includeDeleted: true });
    }

    return query.exec();
  }

  async count(options: Omit<FindBlogsOptions, 'skip' | 'limit' | 'sort'>): Promise<number> {
    const filter = this.buildFilter(options);
    const query = Blog.countDocuments(filter);

    if (options.trashOnly || options.includeTrash) {
      query.setOptions({ includeDeleted: true });
    }

    return query.exec();
  }

  async findById(id: string, includeDeleted = false): Promise<IBlog | null> {
    const query = Blog.findById(id).populate(BLOG_POPULATE);
    if (includeDeleted) query.setOptions({ includeDeleted: true });
    return query.exec();
  }

  async findBySlug(slug: string, publishedOnly = false): Promise<IBlog | null> {
    const filter: Record<string, unknown> = { slug: slug.toLowerCase() };
    if (publishedOnly) {
      filter.publicationStatus = BlogPublicationStatus.PUBLISHED;
    }

    return Blog.findOne(filter).populate(BLOG_POPULATE).exec();
  }

  async findPublishedForFeeds(): Promise<IBlog[]> {
    return Blog.find({
      publicationStatus: BlogPublicationStatus.PUBLISHED,
      isDeleted: { $ne: true },
    })
      .select(
        'slug title excerpt summary metaTitle metaDescription featuredImage publishedAt updatedAt includeInSitemap includeInRss robotsIndex author category',
      )
      .populate([
        { path: 'author', select: 'name slug' },
        { path: 'category', select: 'name slug' },
      ])
      .sort({ publishedAt: -1 })
      .exec();
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Record<string, unknown> = {
      slug: slug.toLowerCase(),
      isDeleted: { $ne: true },
    };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const count = await Blog.countDocuments(filter);
    return count > 0;
  }

  async create(data: Partial<IBlog>): Promise<IBlog> {
    const blog = await Blog.create(data);
    return (await Blog.findById(blog.id).populate(BLOG_POPULATE).exec())!;
  }

  async updateById(id: string, data: UpdateQuery<IBlog>): Promise<IBlog | null> {
    return Blog.findByIdAndUpdate(id, data, { new: true }).populate(BLOG_POPULATE).exec();
  }

  async softDeleteById(id: string, actorId: string): Promise<IBlog | null> {
    return Blog.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        updatedBy: actorId,
      },
      { new: true },
    )
      .setOptions({ includeDeleted: true })
      .populate(BLOG_POPULATE)
      .exec();
  }

  async restoreById(id: string, actorId: string): Promise<IBlog | null> {
    return Blog.findByIdAndUpdate(
      id,
      {
        isDeleted: false,
        deletedAt: null,
        updatedBy: actorId,
      },
      { new: true },
    )
      .setOptions({ includeDeleted: true })
      .populate(BLOG_POPULATE)
      .exec();
  }

  async permanentDeleteById(id: string): Promise<void> {
    await Blog.deleteOne({ _id: id }).setOptions({ includeDeleted: true }).exec();
    await BlogAutosave.deleteMany({ blog: id }).exec();
    await BlogRevision.deleteMany({ blog: id }).exec();
  }

  async bulkSoftDelete(ids: string[], actorId: string): Promise<number> {
    const result = await Blog.updateMany(
      { _id: { $in: ids }, isDeleted: { $ne: true } },
      {
        isDeleted: true,
        deletedAt: new Date(),
        updatedBy: actorId,
      },
    ).exec();

    return result.modifiedCount;
  }

  async bulkUpdateStatus(
    ids: string[],
    status: BlogPublicationStatus,
    actorId: string,
    extra: Record<string, unknown> = {},
  ): Promise<number> {
    const result = await Blog.updateMany(
      { _id: { $in: ids }, isDeleted: { $ne: true } },
      {
        publicationStatus: status,
        updatedBy: actorId,
        ...extra,
      },
    ).exec();

    return result.modifiedCount;
  }

  async bulkRestore(ids: string[], actorId: string): Promise<number> {
    const result = await Blog.updateMany(
      { _id: { $in: ids }, isDeleted: true },
      {
        isDeleted: false,
        deletedAt: null,
        updatedBy: actorId,
      },
    )
      .setOptions({ includeDeleted: true })
      .exec();

    return result.modifiedCount;
  }

  async getNextRevisionVersion(blogId: string): Promise<number> {
    const latest = await BlogRevision.findOne({ blog: blogId })
      .sort({ version: -1 })
      .select('version')
      .exec();

    return (latest?.version ?? 0) + 1;
  }

  async createRevision(
    blogId: string,
    snapshot: Record<string, unknown>,
    actorId?: string,
  ): Promise<void> {
    const version = await this.getNextRevisionVersion(blogId);
    await BlogRevision.create({
      blog: blogId,
      version,
      snapshot,
      createdBy: actorId,
    });
  }

  async upsertAutosave(
    blogId: string,
    userId: string,
    data: Partial<IBlogAutosave>,
  ): Promise<IBlogAutosave> {
    return BlogAutosave.findOneAndUpdate(
      { blog: blogId, user: userId },
      { $set: data },
      { upsert: true, new: true },
    ).exec();
  }

  async incrementViewCount(id: string): Promise<void> {
    await Blog.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();
  }
}

export const blogRepository = new BlogRepository();

export function toObjectId(value: string | undefined | null): Types.ObjectId | undefined {
  if (!value) return undefined;
  return new Types.ObjectId(value);
}
