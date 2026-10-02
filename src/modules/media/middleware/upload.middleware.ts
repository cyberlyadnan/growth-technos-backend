import multer from 'multer';
import { env } from '@core/config';

const maxFileSizeBytes = env.BLOG_MAX_UPLOAD_MB * 1024 * 1024;

const baseUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSizeBytes,
    files: 10,
  },
});

export const uploadSingleFile = baseUpload.single('file');
export const uploadMultipleFiles = baseUpload.array('files', 10);
