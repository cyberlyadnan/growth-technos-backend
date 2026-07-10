import { env } from '@core/config';
import { MediaStorageProvider } from '@core/constants';
import { BadRequestError } from '@core/errors';
import { localStorageService } from './local.storage';
import { StorageService } from './storage.types';

export function getStorageService(): StorageService {
  switch (env.STORAGE_PROVIDER) {
    case 'local':
      return localStorageService;
    case 's3':
    case 'firebase':
      throw new BadRequestError(`${env.STORAGE_PROVIDER} storage is not configured yet`);
    default:
      return localStorageService;
  }
}

export function resolveStorageProvider(): MediaStorageProvider {
  switch (env.STORAGE_PROVIDER) {
    case 'local':
      return MediaStorageProvider.LOCAL;
    case 's3':
      return MediaStorageProvider.S3;
    case 'firebase':
      return MediaStorageProvider.FIREBASE;
    default:
      return MediaStorageProvider.LOCAL;
  }
}

export { localStorageService } from './local.storage';
export type { StorageService, StoredFile, UploadOptions } from './storage.types';
