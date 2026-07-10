import { Document, Model, UpdateQuery } from 'mongoose';
import { buildSearchFilter } from '@core/pagination/pagination';

export interface TaxonomyDocument extends Document {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FindTaxonomyOptions {
  skip: number;
  limit: number;
  sort: Record<string, 1 | -1>;
  search?: string;
  isActive?: boolean;
  includeTrash?: boolean;
  trashOnly?: boolean;
}

export class TaxonomyRepository<T extends TaxonomyDocument> {
  constructor(private readonly model: Model<T>) {}

  private buildFilter(
    options: Omit<FindTaxonomyOptions, 'skip' | 'limit' | 'sort'>,
    searchFields: string[],
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      ...buildSearchFilter(options.search, searchFields),
    };

    if (options.trashOnly) {
      filter.isDeleted = true;
    } else if (!options.includeTrash) {
      filter.isDeleted = { $ne: true };
    }

    if (options.isActive !== undefined) {
      filter.isActive = options.isActive;
    }

    return filter;
  }

  async findMany(
    options: FindTaxonomyOptions,
    searchFields: string[],
  ): Promise<T[]> {
    const filter = this.buildFilter(options, searchFields);
    const query = this.model.find(filter).sort(options.sort).skip(options.skip).limit(options.limit);

    if (options.trashOnly || options.includeTrash) {
      query.setOptions({ includeDeleted: true });
    }

    return query.exec();
  }

  async count(
    options: Omit<FindTaxonomyOptions, 'skip' | 'limit' | 'sort'>,
    searchFields: string[],
  ): Promise<number> {
    const filter = this.buildFilter(options, searchFields);
    const query = this.model.countDocuments(filter);

    if (options.trashOnly || options.includeTrash) {
      query.setOptions({ includeDeleted: true });
    }

    return query.exec();
  }

  async findById(id: string, includeDeleted = false): Promise<T | null> {
    const query = this.model.findById(id);
    if (includeDeleted) query.setOptions({ includeDeleted: true });
    return query.exec();
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Record<string, unknown> = {
      slug: slug.toLowerCase(),
      isDeleted: { $ne: true },
    };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const count = await this.model.countDocuments(filter);
    return count > 0;
  }

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data);
  }

  async updateById(id: string, data: UpdateQuery<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async softDeleteById(id: string, actorId: string): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        {
          isDeleted: true,
          deletedAt: new Date(),
          updatedBy: actorId,
        },
        { new: true },
      )
      .setOptions({ includeDeleted: true })
      .exec();
  }

  async restoreById(id: string, actorId: string): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        {
          isDeleted: false,
          deletedAt: null,
          updatedBy: actorId,
        },
        { new: true },
      )
      .setOptions({ includeDeleted: true })
      .exec();
  }

  async permanentDeleteById(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }).setOptions({ includeDeleted: true }).exec();
  }
}
