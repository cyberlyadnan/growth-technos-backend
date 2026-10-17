import multer from 'multer';
import { env } from '@core/config';

const maxFileSizeBytes = env.AGENCY_DOC_MAX_UPLOAD_MB * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSizeBytes,
    files: 1,
  },
});

export const uploadAgencyDocument = upload.single('file');
