import { BadRequestError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import { getStorageService, resolveStorageProvider } from '@core/storage';
import { Blog } from '@modules/blogs/model/blog.model';
import { IBlogMedia } from '@modules/blogs/model/blog.model';
import { toObjectId } from '@modules/blogs/repository/blog.repository';
import { mediaRepository } from '../repository/media.repository';
import {
  ListMediaQuery,
  MediaResponse,
  UpdateMediaDto,
  UploadMediaOptions,
} from '../types/media.types';

export class MediaService {
  private toMediaResponse(media: IBlogMedia): MediaResponse {
    return {
      id: media.id,
      filename: media.filename,
      originalName: media.originalName,
      mimeType: media.mimeType,
      size: media.size,
      storageProvider: media.storageProvider,
      path: media.path,
      url: media.url,
      alt: media.alt,
      caption: media.caption,
      width: media.width,
      height: media.height,
      thumbnails: media.thumbnails,
      blog: media.blog?.toString(),
      folder: media.folder,
      isDeleted: media.isDeleted,
      deletedAt: media.deletedAt?.toISOString(),
      uploadedBy: media.uploadedBy?.toString(),
      createdAt: media.createdAt.toISOString(),
      updatedAt: media.updatedAt.toISOString(),
    };
  }

  private async getMediaOrThrow(id: string, includeDeleted = false): Promise<IBlogMedia> {
    const media = await mediaRepository.findById(id, includeDeleted);
    if (!media) throw new NotFoundError('Media');
    return media;
  }

  private async validateBlog(blogId?: string): Promise<void> {
    if (!blogId) return;
    const blog = await Blog.findById(blogId).exec();
    if (!blog) throw new BadRequestError('Blog not found');
  }

  async list(
    query: ListMediaQuery,
  ): Promise<{ media: MediaResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);

    const [items, total] = await Promise.all([
      mediaRepository.findMany({
        skip,
        limit,
        sort,
        search: query.search,
        folder: query.folder,
        blog: query.blog,
        includeTrash: query.includeTrash,
        trashOnly: query.trashOnly,
      }),
      mediaRepository.count({
        search: query.search,
        folder: query.folder,
        blog: query.blog,
        includeTrash: query.includeTrash,
        trashOnly: query.trashOnly,
      }),
    ]);

    return {
      media: items.map((item) => this.toMediaResponse(item)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<MediaResponse> {
    const media = await this.getMediaOrThrow(id);
    return this.toMediaResponse(media);
  }

  async upload(
    file: Express.Multer.File,
    options: UploadMediaOptions,
    actorId: string,
  ): Promise<MediaResponse> {
    await this.validateBlog(options.blog);

    const storage = getStorageService();
    const stored = await storage.upload(file.buffer, {
      folder: options.folder,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });

    const media = await mediaRepository.create({
      filename: stored.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: stored.size,
      storageProvider: resolveStorageProvider(),
      path: stored.path,
      url: stored.url,
      alt: options.alt,
      caption: options.caption,
      blog: toObjectId(options.blog),
      folder: options.folder ?? 'blogs',
      uploadedBy: toObjectId(actorId),
    } as Partial<IBlogMedia>);

    loggers.admin.info('Media uploaded', { mediaId: media.id, actorId });
    return this.toMediaResponse(media);
  }

  async uploadMany(
    files: Express.Multer.File[],
    options: UploadMediaOptions,
    actorId: string,
  ): Promise<MediaResponse[]> {
    const uploaded: MediaResponse[] = [];

    for (const file of files) {
      uploaded.push(await this.upload(file, options, actorId));
    }

    return uploaded;
  }

  async update(id: string, dto: UpdateMediaDto): Promise<MediaResponse> {
    const existing = await this.getMediaOrThrow(id);
    if (existing.isDeleted) throw new BadRequestError('Cannot update media in trash');

    await this.validateBlog(dto.blog ?? undefined);

    const updated = await mediaRepository.updateById(id, {
      ...(dto.alt !== undefined && { alt: dto.alt || undefined }),
      ...(dto.caption !== undefined && { caption: dto.caption || undefined }),
      ...(dto.blog !== undefined && { blog: toObjectId(dto.blog ?? undefined) ?? null }),
    });

    if (!updated) throw new NotFoundError('Media');
    return this.toMediaResponse(updated);
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    const media = await this.getMediaOrThrow(id);
    if (media.isDeleted) throw new BadRequestError('Media is already in trash');

    await mediaRepository.softDeleteById(id);
    loggers.admin.info('Media moved to trash', { mediaId: id, actorId });
  }

  async restore(id: string, actorId: string): Promise<MediaResponse> {
    const media = await this.getMediaOrThrow(id, true);
    if (!media.isDeleted) throw new BadRequestError('Media is not in trash');

    const restored = await mediaRepository.restoreById(id);
    if (!restored) throw new NotFoundError('Media');

    loggers.admin.info('Media restored', { mediaId: id, actorId });
    return this.toMediaResponse(restored);
  }

  async permanentDelete(id: string, actorId: string): Promise<void> {
    const media = await this.getMediaOrThrow(id, true);
    const storage = getStorageService();

    await storage.delete(media.path);
    await mediaRepository.permanentDeleteById(id);
    loggers.admin.info('Media permanently deleted', { mediaId: id, actorId });
  }
}

export const mediaService = new MediaService();
