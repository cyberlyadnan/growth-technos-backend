export interface MediaResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageProvider: string;
  path: string;
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  thumbnails?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  blog?: string;
  folder: string;
  isDeleted: boolean;
  deletedAt?: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListMediaQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  folder?: string;
  blog?: string;
  includeTrash?: boolean;
  trashOnly?: boolean;
}

export interface UpdateMediaDto {
  alt?: string;
  caption?: string;
  blog?: string | null;
}

export interface UploadMediaOptions {
  alt?: string;
  caption?: string;
  blog?: string;
  folder?: string;
}
