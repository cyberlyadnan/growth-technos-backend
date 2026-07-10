import { UpdateQuery } from 'mongoose';
import { BadRequestError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import { ensureUniqueSlug, slugify } from '@core/utils/slug';
import { User } from '@modules/users/model/user.model';
import { toObjectId } from '@modules/blogs/repository/blog.repository';
import { Author, IAuthor } from '../model/author.model';
import { TaxonomyRepository } from '@modules/shared/taxonomy/taxonomy.repository';
import { ListTaxonomyQuery } from '@modules/shared/taxonomy/taxonomy.service';

export interface AuthorResponse {
  id: string;
  name: string;
  slug: string;
  designation?: string;
  photo?: string;
  bio?: string;
  linkedIn?: string;
  twitter?: string;
  github?: string;
  website?: string;
  email?: string;
  user?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAuthorDto {
  name: string;
  slug?: string;
  designation?: string;
  photo?: string;
  bio?: string;
  linkedIn?: string;
  twitter?: string;
  github?: string;
  website?: string;
  email?: string;
  user?: string | null;
  isActive?: boolean;
}

export type UpdateAuthorDto = Partial<CreateAuthorDto>;

const authorRepository = new TaxonomyRepository<IAuthor>(Author);

export class AuthorService {
  private toResponse(author: IAuthor): AuthorResponse {
    return {
      id: author.id,
      name: author.name,
      slug: author.slug,
      designation: author.designation,
      photo: author.photo,
      bio: author.bio,
      linkedIn: author.linkedIn,
      twitter: author.twitter,
      github: author.github,
      website: author.website,
      email: author.email,
      user: author.user?.toString(),
      isActive: author.isActive,
      isDeleted: author.isDeleted,
      deletedAt: author.deletedAt?.toISOString(),
      createdAt: author.createdAt.toISOString(),
      updatedAt: author.updatedAt.toISOString(),
    };
  }

  private async getOrThrow(id: string, includeDeleted = false): Promise<IAuthor> {
    const author = await authorRepository.findById(id, includeDeleted);
    if (!author) throw new NotFoundError('Author');
    return author;
  }

  private async resolveSlug(name: string, slug?: string, excludeId?: string): Promise<string> {
    const base = slugify(slug || name);
    return ensureUniqueSlug(base, async (candidate) =>
      authorRepository.slugExists(candidate, excludeId),
    );
  }

  private async validateUser(userId?: string | null): Promise<void> {
    if (!userId) return;
    const user = await User.findById(userId).exec();
    if (!user) throw new BadRequestError('Linked user not found');
  }

  private mapAuthorFields(dto: CreateAuthorDto | UpdateAuthorDto): Record<string, unknown> {
    return {
      ...(dto.designation !== undefined && { designation: dto.designation || undefined }),
      ...(dto.photo !== undefined && { photo: dto.photo || undefined }),
      ...(dto.bio !== undefined && { bio: dto.bio || undefined }),
      ...(dto.linkedIn !== undefined && { linkedIn: dto.linkedIn || undefined }),
      ...(dto.twitter !== undefined && { twitter: dto.twitter || undefined }),
      ...(dto.github !== undefined && { github: dto.github || undefined }),
      ...(dto.website !== undefined && { website: dto.website || undefined }),
      ...(dto.email !== undefined && { email: dto.email || undefined }),
      ...(dto.user !== undefined && { user: dto.user || null }),
    };
  }

  async list(
    query: ListTaxonomyQuery,
  ): Promise<{ items: AuthorResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);

    const [items, total] = await Promise.all([
      authorRepository.findMany(
        {
          skip,
          limit,
          sort,
          search: query.search,
          isActive: query.isActive,
          includeTrash: query.includeTrash,
          trashOnly: query.trashOnly,
        },
        ['name', 'slug', 'bio', 'designation', 'email'],
      ),
      authorRepository.count(
        {
          search: query.search,
          isActive: query.isActive,
          includeTrash: query.includeTrash,
          trashOnly: query.trashOnly,
        },
        ['name', 'slug', 'bio', 'designation', 'email'],
      ),
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<AuthorResponse> {
    const author = await this.getOrThrow(id);
    return this.toResponse(author);
  }

  async create(dto: CreateAuthorDto, actorId: string): Promise<AuthorResponse> {
    await this.validateUser(dto.user);

    const slug = await this.resolveSlug(dto.name, dto.slug);
    const author = await authorRepository.create({
      name: dto.name,
      slug,
      isActive: dto.isActive ?? true,
      createdBy: toObjectId(actorId),
      updatedBy: toObjectId(actorId),
      ...this.mapAuthorFields(dto),
    } as unknown as Partial<IAuthor>);

    loggers.admin.info('Author created', { id: author.id, actorId });
    return this.toResponse(author);
  }

  async update(id: string, dto: UpdateAuthorDto, actorId: string): Promise<AuthorResponse> {
    const existing = await this.getOrThrow(id);
    if (existing.isDeleted) throw new BadRequestError('Cannot update author in trash');

    await this.validateUser(dto.user);

    const updateData: Record<string, unknown> = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...this.mapAuthorFields(dto),
      updatedBy: actorId,
    };

    if (dto.slug || dto.name) {
      updateData.slug = await this.resolveSlug(
        dto.name ?? existing.name,
        dto.slug ?? existing.slug,
        id,
      );
    }

    const updated = await authorRepository.updateById(id, updateData as UpdateQuery<IAuthor>);
    if (!updated) throw new NotFoundError('Author');

    loggers.admin.info('Author updated', { id, actorId });
    return this.toResponse(updated);
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    const author = await this.getOrThrow(id);
    if (author.isDeleted) throw new BadRequestError('Author is already in trash');

    await authorRepository.softDeleteById(id, actorId);
    loggers.admin.info('Author moved to trash', { id, actorId });
  }

  async restore(id: string, actorId: string): Promise<AuthorResponse> {
    const author = await this.getOrThrow(id, true);
    if (!author.isDeleted) throw new BadRequestError('Author is not in trash');

    const restored = await authorRepository.restoreById(id, actorId);
    if (!restored) throw new NotFoundError('Author');

    loggers.admin.info('Author restored', { id, actorId });
    return this.toResponse(restored);
  }

  async permanentDelete(id: string, actorId: string): Promise<void> {
    await this.getOrThrow(id, true);
    await authorRepository.permanentDeleteById(id);
    loggers.admin.info('Author permanently deleted', { id, actorId });
  }
}

export const authorService = new AuthorService();
