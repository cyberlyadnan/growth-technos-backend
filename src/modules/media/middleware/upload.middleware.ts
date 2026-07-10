import multer from 'multer';
import { env } from '@core/config';
import { ALLOWED_IMAGE_MIME_TYPES } from '@core/constants';
import { BadRequestError } from '@core/errors';

const maxFileSizeBytes = env.BLOG_MAX_UPLOAD_MB * 1024 * 1024;

const imageFileFilter: multer.Options['fileFilter'] = (_req, file, callback) => {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    callback(new BadRequestError('Only JPEG, PNG, WebP, and GIF images are allowed'));
    return;
  }

  callback(null, true);
};

const baseUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSizeBytes,
    files: 10,
  },
  fileFilter: imageFileFilter,
});

export const uploadSingleImage = baseUpload.single('file');
export const uploadMultipleImages = baseUpload.array('files', 10);
