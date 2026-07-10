export interface UploadOptions {
  folder?: string;
  originalName: string;
  mimeType: string;
}

export interface StoredFile {
  filename: string;
  path: string;
  url: string;
  size: number;
}

export interface StorageService {
  upload(file: Buffer, options: UploadOptions): Promise<StoredFile>;
  delete(relativePath: string): Promise<void>;
  getPublicUrl(relativePath: string): string;
}
