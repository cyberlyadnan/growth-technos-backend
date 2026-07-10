import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize, validate } from '@core/middlewares';
import { mediaController } from '../controller/media.controller';
import { uploadMultipleImages, uploadSingleImage } from '../middleware/upload.middleware';
import {
  listMediaSchema,
  mediaIdParamSchema,
  updateMediaSchema,
  uploadMediaFieldsSchema,
} from '../validation/media.validation';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(Permission.MEDIA_READ),
  validate(listMediaSchema, 'query'),
  mediaController.list,
);
router.post(
  '/upload',
  authorize(Permission.MEDIA_UPLOAD),
  uploadSingleImage,
  validate(uploadMediaFieldsSchema),
  mediaController.upload,
);
router.post(
  '/upload/bulk',
  authorize(Permission.MEDIA_UPLOAD),
  uploadMultipleImages,
  validate(uploadMediaFieldsSchema),
  mediaController.uploadBulk,
);
router.get(
  '/:id',
  authorize(Permission.MEDIA_READ),
  validate(mediaIdParamSchema, 'params'),
  mediaController.getById,
);
router.patch(
  '/:id',
  authorize(Permission.MEDIA_UPLOAD),
  validate(mediaIdParamSchema, 'params'),
  validate(updateMediaSchema),
  mediaController.update,
);
router.delete(
  '/:id',
  authorize(Permission.MEDIA_DELETE),
  validate(mediaIdParamSchema, 'params'),
  mediaController.remove,
);
router.post(
  '/:id/restore',
  authorize(Permission.MEDIA_UPLOAD),
  validate(mediaIdParamSchema, 'params'),
  mediaController.restore,
);
router.delete(
  '/:id/permanent',
  authorize(Permission.MEDIA_DELETE),
  validate(mediaIdParamSchema, 'params'),
  mediaController.permanentDelete,
);

export default router;
