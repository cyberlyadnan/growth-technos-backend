import { UpdateQuery } from 'mongoose';
import { buildSearchFilter } from '@core/pagination/pagination';
import { BlogMedia, IBlogMedia } from '@modules/blogs/model/blog.model';

export interface FindMediaOptions {
  skip: number;
  limit: number;
  sort: Record<string, 1 | -1>;
  search?: string;
  folder?: string;
  blog?: string;
  includeTrash?: boolean;
  trashOnly?: boolean;
}

export class MediaRepository {
  private buildFilter(options: Omit<FindMediaOptions, 'skip' | 'limit' | 'sort'>): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      ...buildSearchFilter(options.search, ['filename', 'originalName', 'alt', 'caption']),
    };

    if (options.trashOnly) {
      filter.isDeleted = true;
    } else if (!options.includeTrash) {
      filter.isDeleted = { $ne: true };
    }

    if (options.folder) filter.folder = options.folder;
    if (options.blog) filter.blog = options.blog;

    return filter;
  }

  async findMany(options: FindMediaOptions): Promise<IBlogMedia[]> {
    const filter = this.buildFilter(options);
    const query = BlogMedia.find(filter).sort(options.sort).skip(options.skip).limit(options.limit);

    if (options.trashOnly || options.includeTrash) {
      query.setOptions({ includeDeleted: true });
    }

    return query.exec();
  }

  async count(options: Omit<FindMediaOptions, 'skip' | 'limit' | 'sort'>): Promise<number> {
    const filter = this.buildFilter(options);
    const query = BlogMedia.countDocuments(filter);

    if (options.trashOnly || options.includeTrash) {
      query.setOptions({ includeDeleted: true });
    }

    return query.exec();
  }

  async findById(id: string, includeDeleted = false): Promise<IBlogMedia | null> {
    const query = BlogMedia.findById(id);
    if (includeDeleted) query.setOptions({ includeDeleted: true });
    return query.exec();
  }

  async create(data: Partial<IBlogMedia>): Promise<IBlogMedia> {
    return BlogMedia.create(data);
  }

  async updateById(id: string, data: UpdateQuery<IBlogMedia>): Promise<IBlogMedia | null> {
    return BlogMedia.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async softDeleteById(id: string): Promise<IBlogMedia | null> {
    return BlogMedia.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true },
    ).exec();
  }

  async restoreById(id: string): Promise<IBlogMedia | null> {
    return BlogMedia.findByIdAndUpdate(
      id,
      { isDeleted: false, deletedAt: null },
      { new: true },
    )
      .setOptions({ includeDeleted: true })
      .exec();
  }

  async permanentDeleteById(id: string): Promise<IBlogMedia | null> {
    return BlogMedia.findByIdAndDelete(id).setOptions({ includeDeleted: true }).exec();
  }
}

export const mediaRepository = new MediaRepository();
