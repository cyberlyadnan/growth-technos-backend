import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '@core/config';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  AllowedImageMimeType,
  IMAGE_MIME_EXTENSIONS,
} from '@core/constants';
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
    const baseDir = [
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'growth-technos-backend', 'uploads'),
    ].some((dir) => fsSync.existsSync(dir))
      ? fsSync.existsSync(path.join(process.cwd(), 'growth-technos-backend', 'uploads'))
        ? path.join(process.cwd(), 'growth-technos-backend')
        : process.cwd()
      : process.cwd();

    this.uploadRoot = path.resolve(baseDir, env.BLOG_UPLOAD_DIR);
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
    await this.ensureUploadDir();

    const extension = resolveExtension(options.originalName, options.mimeType);
    const filename = `${randomUUID()}${extension}`;
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
