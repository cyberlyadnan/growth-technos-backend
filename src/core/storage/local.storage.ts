import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '@core/config';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  AllowedImageMimeType,
  IMAGE_MIME_EXTENSIONS,
} from '@core/constants';
import { BadRequestError } from '@core/errors';
import { StorageService, StoredFile, UploadOptions } from './storage.types';

function resolveExtension(originalName: string, mimeType: string): string {
  if (ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as AllowedImageMimeType)) {
    return IMAGE_MIME_EXTENSIONS[mimeType as AllowedImageMimeType];
  }

  const fromName = path.extname(originalName).toLowerCase();
  return fromName || '.bin';
}

export class LocalStorageService implements StorageService {
  private readonly uploadRoot: string;

  constructor() {
    this.uploadRoot = path.resolve(process.cwd(), env.BLOG_UPLOAD_DIR);
  }

  private async ensureUploadDir(): Promise<void> {
    await fs.mkdir(this.uploadRoot, { recursive: true });
  }

  getPublicUrl(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/');
    const prefix = env.BLOG_UPLOAD_URL_PREFIX.replace(/\/$/, '');
    const filename = path.posix.basename(normalized);
    return `${env.APP_URL}${prefix}/${filename}`;
  }

  async upload(file: Buffer, options: UploadOptions): Promise<StoredFile> {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(options.mimeType as AllowedImageMimeType)) {
      throw new BadRequestError('Unsupported image type');
    }

    await this.ensureUploadDir();

    const extension = resolveExtension(options.originalName, options.mimeType);
    const filename = `${uuidv4()}${extension}`;
    const absolutePath = path.join(this.uploadRoot, filename);
    const relativePath = path.posix.join(env.BLOG_UPLOAD_DIR.replace(/\\/g, '/'), filename);

    await fs.writeFile(absolutePath, file);

    return {
      filename,
      path: relativePath,
      url: this.getPublicUrl(relativePath),
      size: file.length,
    };
  }

  async delete(relativePath: string): Promise<void> {
    const filename = path.basename(relativePath);
    const absolutePath = path.join(this.uploadRoot, filename);

    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

export const localStorageService = new LocalStorageService();
