import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize, publicCacheMiddleware, validate } from '@core/middlewares';
import { faqController } from '../controller/faq.controller';
import {
  createFaqSchema,
  faqIdParamSchema,
  listFaqSchema,
  listPublicFaqSchema,
  updateFaqSchema,
} from '../validation/faq.validation';

const router = Router();
const CMS_LIST_CACHE_SECONDS = 3600;

router.get(
  '/public',
  publicCacheMiddleware(CMS_LIST_CACHE_SECONDS),
  validate(listPublicFaqSchema, 'query'),
  faqController.listPublic,
);

router.use(authenticate);

router.get('/', authorize(Permission.CONTENT_READ), validate(listFaqSchema, 'query'), faqController.list);
router.post('/', authorize(Permission.CONTENT_CREATE), validate(createFaqSchema), faqController.create);
router.get(
  '/:id',
  authorize(Permission.CONTENT_READ),
  validate(faqIdParamSchema, 'params'),
  faqController.getById,
);
router.patch(
  '/:id',
  authorize(Permission.CONTENT_UPDATE),
  validate(faqIdParamSchema, 'params'),
  validate(updateFaqSchema),
  faqController.update,
);
router.delete(
  '/:id',
  authorize(Permission.CONTENT_DELETE),
  validate(faqIdParamSchema, 'params'),
  faqController.remove,
);
router.post(
  '/:id/restore',
  authorize(Permission.CONTENT_UPDATE),
  validate(faqIdParamSchema, 'params'),
  faqController.restore,
);
router.delete(
  '/:id/permanent',
  authorize(Permission.CONTENT_DELETE),
  validate(faqIdParamSchema, 'params'),
  faqController.permanentDelete,
);

export default router;
