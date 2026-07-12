import { UpdateQuery, Types } from 'mongoose';
import { CmsPublicationStatus } from '@core/constants/cms';
import { buildSearchFilter } from '@core/pagination/pagination';
import { Service, IService } from '../model/service.model';

export const SERVICE_POPULATE = [
  { path: 'industries', select: 'name slug icon' },
  { path: 'primaryIndustry', select: 'name slug icon' },
  { path: 'parentService', select: 'title slug kind' },
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

export interface FindServicesOptions {
  skip: number;
  limit: number;
  sort: Record<string, 1 | -1>;
  search?: string;
  publicationStatus?: CmsPublicationStatus;
  kind?: string;
  categorySlug?: string;
  parentService?: string;
  industry?: string;
  isFeatured?: boolean;
  isPinned?: boolean;
  includeTrash?: boolean;
  trashOnly?: boolean;
  publishedOnly?: boolean;
  summaryOnly?: boolean;
}

export class ServiceRepository {
  private buildFilter(options: Omit<FindServicesOptions, 'skip' | 'limit' | 'sort'>): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      ...buildSearchFilter(options.search, ['title', 'shortDescription', 'fullDescription', 'slug', 'categoryTitle']),
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

    if (options.kind) filter.kind = options.kind;
    if (options.categorySlug) filter.categorySlug = options.categorySlug.toLowerCase();
    if (options.parentService) filter.parentService = options.parentService;
    if (options.industry) filter.industries = options.industry;
    if (options.isFeatured !== undefined) filter.isFeatured = options.isFeatured;
    if (options.isPinned !== undefined) filter.isPinned = options.isPinned;

    return filter;
  }

  async findMany(options: FindServicesOptions): Promise<IService[]> {
    const filter = this.buildFilter(options);
    const query = Service.find(filter)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .populate(SERVICE_POPULATE);

    if (options.summaryOnly) {
      query.select('-content.document -content.html -fullDescription -faqs -process');
    }

    if (options.trashOnly || options.includeTrash) {
      query.setOptions({ includeDeleted: true });
    }

    return query.exec();
  }

  async count(options: Omit<FindServicesOptions, 'skip' | 'limit' | 'sort'>): Promise<number> {
    const filter = this.buildFilter(options);
    const query = Service.countDocuments(filter);

    if (options.trashOnly || options.includeTrash) {
      query.setOptions({ includeDeleted: true });
    }

    return query.exec();
  }

  async findById(id: string, includeDeleted = false): Promise<IService | null> {
    const query = Service.findById(id).populate(SERVICE_POPULATE);
    if (includeDeleted) query.setOptions({ includeDeleted: true });
    return query.exec();
  }

  async findBySlug(slug: string, publishedOnly = false): Promise<IService | null> {
    const filter: Record<string, unknown> = { slug: slug.toLowerCase() };
    if (publishedOnly) {
      filter.publicationStatus = CmsPublicationStatus.PUBLISHED;
    }

    return Service.findOne(filter).populate(SERVICE_POPULATE).exec();
  }

  async findPublishedForFeeds(): Promise<IService[]> {
    return Service.find({
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

    return (await Service.countDocuments(filter)) > 0;
  }

  async create(data: Partial<IService>): Promise<IService> {
    const service = await Service.create(data);
    return (await Service.findById(service.id).populate(SERVICE_POPULATE).exec())!;
  }

  async updateById(id: string, data: UpdateQuery<IService>): Promise<IService | null> {
    return Service.findByIdAndUpdate(id, data, { new: true }).populate(SERVICE_POPULATE).exec();
  }

  async softDeleteById(id: string, actorId: string): Promise<IService | null> {
    return Service.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date(), updatedBy: actorId },
      { new: true },
    )
      .setOptions({ includeDeleted: true })
      .populate(SERVICE_POPULATE)
      .exec();
  }

  async restoreById(id: string, actorId: string): Promise<IService | null> {
    return Service.findByIdAndUpdate(
      id,
      { isDeleted: false, deletedAt: null, updatedBy: actorId },
      { new: true },
    )
      .setOptions({ includeDeleted: true })
      .populate(SERVICE_POPULATE)
      .exec();
  }

  async permanentDeleteById(id: string): Promise<void> {
    await Service.deleteOne({ _id: id }).setOptions({ includeDeleted: true }).exec();
  }

  async bulkSoftDelete(ids: string[], actorId: string): Promise<number> {
    const result = await Service.updateMany(
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
    const result = await Service.updateMany(
      { _id: { $in: ids }, isDeleted: { $ne: true } },
      { publicationStatus: status, updatedBy: actorId, ...extra },
    ).exec();
    return result.modifiedCount;
  }

  async bulkRestore(ids: string[], actorId: string): Promise<number> {
    const result = await Service.updateMany(
      { _id: { $in: ids }, isDeleted: true },
      { isDeleted: false, deletedAt: null, updatedBy: actorId },
    )
      .setOptions({ includeDeleted: true })
      .exec();
    return result.modifiedCount;
  }

  async incrementViewCount(id: string): Promise<void> {
    await Service.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();
  }
}

export const serviceRepository = new ServiceRepository();

export function toObjectId(value: string | undefined | null): Types.ObjectId | undefined {
  if (!value) return undefined;
  return new Types.ObjectId(value);
}
