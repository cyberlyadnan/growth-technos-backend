import { UpdateQuery, Types } from 'mongoose';
import { CmsPublicationStatus } from '@core/constants/cms';
import { buildSearchFilter } from '@core/pagination/pagination';
import { PortfolioProject, IPortfolioProject } from '../model/portfolio.model';

export const PORTFOLIO_POPULATE = [
  { path: 'industries', select: 'name slug icon' },
  { path: 'primaryIndustry', select: 'name slug icon' },
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

export interface FindPortfolioOptions {
  skip: number;
  limit: number;
  sort: Record<string, 1 | -1>;
  search?: string;
  publicationStatus?: CmsPublicationStatus;
  projectType?: string;
  category?: string;
  industry?: string;
  isFeatured?: boolean;
  isPinned?: boolean;
  includeTrash?: boolean;
  trashOnly?: boolean;
  publishedOnly?: boolean;
  summaryOnly?: boolean;
}

export class PortfolioRepository {
  private buildFilter(options: Omit<FindPortfolioOptions, 'skip' | 'limit' | 'sort'>): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      ...buildSearchFilter(options.search, [
        'title',
        'shortDescription',
        'fullDescription',
        'slug',
        'clientName',
        'category',
      ]),
    };

    if (options.trashOnly) {
      filter.isDeleted = true;
    } else if (!options.includeTrash) {
      filter.isDeleted = { $ne: true };
    }

    if (options.publishedOnly) {
      filter.publicationStatus = CmsPublicationStatus.PUBLISHED;
      filter.isDeleted = { $ne: true };
    } else if (options.publicationStatus) {
      filter.publicationStatus = options.publicationStatus;
    }

    if (options.projectType) filter.projectType = options.projectType;
    if (options.category) filter.category = options.category;
    if (options.industry) filter.industries = options.industry;
    if (options.isFeatured !== undefined) filter.isFeatured = options.isFeatured;
    if (options.isPinned !== undefined) filter.isPinned = options.isPinned;

    return filter;
  }

  async findMany(options: FindPortfolioOptions): Promise<IPortfolioProject[]> {
    const filter = this.buildFilter(options);
    const query = PortfolioProject.find(filter)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .populate(PORTFOLIO_POPULATE);

    if (options.summaryOnly) {
      query.select('-content.document -content.html -fullDescription -challenge -solution -gallery');
    }

    if (options.trashOnly || options.includeTrash) {
      query.setOptions({ includeDeleted: true });
    }

    return query.exec();
  }

  async count(options: Omit<FindPortfolioOptions, 'skip' | 'limit' | 'sort'>): Promise<number> {
    const filter = this.buildFilter(options);
    const query = PortfolioProject.countDocuments(filter);

    if (options.trashOnly || options.includeTrash) {
      query.setOptions({ includeDeleted: true });
    }

    return query.exec();
  }

  async findById(id: string, includeDeleted = false): Promise<IPortfolioProject | null> {
    const query = PortfolioProject.findById(id).populate(PORTFOLIO_POPULATE);
    if (includeDeleted) query.setOptions({ includeDeleted: true });
    return query.exec();
  }

  async findBySlug(slug: string, publishedOnly = false): Promise<IPortfolioProject | null> {
    const filter: Record<string, unknown> = { slug: slug.toLowerCase() };
    if (publishedOnly) {
      filter.publicationStatus = CmsPublicationStatus.PUBLISHED;
    }

    return PortfolioProject.findOne(filter).populate(PORTFOLIO_POPULATE).exec();
  }

  async findPublishedForFeeds(): Promise<IPortfolioProject[]> {
    return PortfolioProject.find({
      publicationStatus: CmsPublicationStatus.PUBLISHED,
      isDeleted: { $ne: true },
    })
      .select('slug title shortDescription metaTitle metaDescription publishedAt updatedAt includeInSitemap robotsIndex')
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

    return (await PortfolioProject.countDocuments(filter)) > 0;
  }

  async create(data: Partial<IPortfolioProject>): Promise<IPortfolioProject> {
    const project = await PortfolioProject.create(data);
    return (await PortfolioProject.findById(project.id).populate(PORTFOLIO_POPULATE).exec())!;
  }

  async updateById(id: string, data: UpdateQuery<IPortfolioProject>): Promise<IPortfolioProject | null> {
    return PortfolioProject.findByIdAndUpdate(id, data, { new: true }).populate(PORTFOLIO_POPULATE).exec();
  }

  async softDeleteById(id: string, actorId: string): Promise<IPortfolioProject | null> {
    return PortfolioProject.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date(), updatedBy: actorId },
      { new: true },
    )
      .setOptions({ includeDeleted: true })
      .populate(PORTFOLIO_POPULATE)
      .exec();
  }

  async restoreById(id: string, actorId: string): Promise<IPortfolioProject | null> {
    return PortfolioProject.findByIdAndUpdate(
      id,
      { isDeleted: false, deletedAt: null, updatedBy: actorId },
      { new: true },
    )
      .setOptions({ includeDeleted: true })
      .populate(PORTFOLIO_POPULATE)
      .exec();
  }

  async permanentDeleteById(id: string): Promise<void> {
    await PortfolioProject.deleteOne({ _id: id }).setOptions({ includeDeleted: true }).exec();
  }

  async bulkSoftDelete(ids: string[], actorId: string): Promise<number> {
    const result = await PortfolioProject.updateMany(
      { _id: { $in: ids }, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date(), updatedBy: actorId },
    ).exec();
    return result.modifiedCount;
  }

  async bulkUpdateStatus(
    ids: string[],
    status: CmsPublicationStatus,
    actorId: string,
    extra: Record<string, unknown> = {},
  ): Promise<number> {
    const result = await PortfolioProject.updateMany(
      { _id: { $in: ids }, isDeleted: { $ne: true } },
      { publicationStatus: status, updatedBy: actorId, ...extra },
    ).exec();
    return result.modifiedCount;
  }

  async bulkRestore(ids: string[], actorId: string): Promise<number> {
    const result = await PortfolioProject.updateMany(
      { _id: { $in: ids }, isDeleted: true },
      { isDeleted: false, deletedAt: null, updatedBy: actorId },
    )
      .setOptions({ includeDeleted: true })
      .exec();
    return result.modifiedCount;
  }

  async incrementViewCount(id: string): Promise<void> {
    await PortfolioProject.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();
  }
}

export const portfolioRepository = new PortfolioRepository();

export function toObjectId(value: string | undefined | null): Types.ObjectId | undefined {
  if (!value) return undefined;
  return new Types.ObjectId(value);
}
