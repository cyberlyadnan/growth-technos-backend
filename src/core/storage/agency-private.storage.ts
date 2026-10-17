/**
 * Private on-disk storage for agency documents.
 * Files are NOT exposed via public CDN/static URLs — download only through authenticated API.
 */

import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { env } from '@core/config';
import { BadRequestError, NotFoundError } from '@core/errors';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
]);

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/zip': '.zip',
};

export type PrivateStoredFile = {
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export class AgencyPrivateStorage {
  private readonly root: string;
  private readonly maxBytes: number;

  constructor() {
    this.root = path.resolve(process.cwd(), env.AGENCY_DOC_UPLOAD_DIR);
    this.maxBytes = env.AGENCY_DOC_MAX_UPLOAD_MB * 1024 * 1024;
  }

  assertAllowed(mimeType: string, size: number) {
    if (!ALLOWED_MIME.has(mimeType)) {
      throw new BadRequestError(`File type not allowed: ${mimeType}`);
    }
    if (size <= 0 || size > this.maxBytes) {
      throw new BadRequestError(
        `File must be between 1 byte and ${env.AGENCY_DOC_MAX_UPLOAD_MB} MB`,
      );
    }
  }

  private async ensureRoot() {
    await fs.mkdir(this.root, { recursive: true });
  }

  absolutePath(storageKey: string): string {
    const safe = path.basename(storageKey);
    return path.join(this.root, safe);
  }

  async store(buffer: Buffer, originalName: string, mimeType: string): Promise<PrivateStoredFile> {
    this.assertAllowed(mimeType, buffer.length);
    await this.ensureRoot();
    const ext = EXT_BY_MIME[mimeType] || path.extname(originalName).toLowerCase() || '.bin';
    const storageKey = `${uuidv4()}${ext}`;
    await fs.writeFile(this.absolutePath(storageKey), buffer);
    return {
      storageKey,
      originalName: originalName.slice(0, 255),
      mimeType,
      size: buffer.length,
    };
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await fs.unlink(this.absolutePath(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  async openReadStream(storageKey: string) {
    const abs = this.absolutePath(storageKey);
    try {
      await fs.access(abs);
    } catch {
      throw new NotFoundError('Stored file');
    }
    return createReadStream(abs);
  }
}

export const agencyPrivateStorage = new AgencyPrivateStorage();
export const AGENCY_ALLOWED_DOC_MIME_TYPES = [...ALLOWED_MIME];
