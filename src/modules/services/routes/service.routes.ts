import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize, publicCacheMiddleware, validate } from '@core/middlewares';
import { serviceController } from '../controller/service.controller';
import {
  createServiceSchema,
  listPublicServicesSchema,
  listServicesSchema,
  scheduleServiceSchema,
  serviceBulkActionSchema,
  serviceIdParamSchema,
  serviceSlugParamSchema,
  updateServiceSchema,
} from '../validation/service.validation';

const router = Router();

const CMS_LIST_CACHE_SECONDS = 3600;

router.get(
  '/public',
  publicCacheMiddleware(CMS_LIST_CACHE_SECONDS),
  validate(listPublicServicesSchema, 'query'),
  serviceController.listPublished,
);
router.get(
  '/public/slug/:slug',
  publicCacheMiddleware(CMS_LIST_CACHE_SECONDS),
  validate(serviceSlugParamSchema, 'params'),
  serviceController.getPublishedBySlug,
);
router.get('/public/feeds', publicCacheMiddleware(CMS_LIST_CACHE_SECONDS), serviceController.getPublicFeeds);

router.use(authenticate);

router.get(
  '/',
  authorize(Permission.CONTENT_READ),
  validate(listServicesSchema, 'query'),
  serviceController.list,
);
router.post(
  '/bulk',
  authorize(Permission.CONTENT_UPDATE),
  validate(serviceBulkActionSchema),
  serviceController.bulkAction,
);
router.post('/', authorize(Permission.CONTENT_CREATE), validate(createServiceSchema), serviceController.create);
router.get(
  '/:id',
  authorize(Permission.CONTENT_READ),
  validate(serviceIdParamSchema, 'params'),
  serviceController.getById,
);
router.patch(
  '/:id',
  authorize(Permission.CONTENT_UPDATE),
  validate(serviceIdParamSchema, 'params'),
  validate(updateServiceSchema),
  serviceController.update,
);
router.delete(
  '/:id',
  authorize(Permission.CONTENT_DELETE),
  validate(serviceIdParamSchema, 'params'),
  serviceController.remove,
);
router.delete(
  '/:id/permanent',
  authorize(Permission.CONTENT_DELETE),
  validate(serviceIdParamSchema, 'params'),
  serviceController.permanentDelete,
);
router.post(
  '/:id/restore',
  authorize(Permission.CONTENT_UPDATE),
  validate(serviceIdParamSchema, 'params'),
  serviceController.restore,
);
router.post(
  '/:id/publish',
  authorize(Permission.CONTENT_PUBLISH),
  validate(serviceIdParamSchema, 'params'),
  serviceController.publish,
);
router.post(
  '/:id/unpublish',
  authorize(Permission.CONTENT_PUBLISH),
  validate(serviceIdParamSchema, 'params'),
  serviceController.unpublish,
);
router.post(
  '/:id/schedule',
  authorize(Permission.CONTENT_PUBLISH),
  validate(serviceIdParamSchema, 'params'),
  validate(scheduleServiceSchema),
  serviceController.schedule,
);
router.post(
  '/:id/archive',
  authorize(Permission.CONTENT_PUBLISH),
  validate(serviceIdParamSchema, 'params'),
  serviceController.archive,
);
router.post(
  '/:id/duplicate',
  authorize(Permission.CONTENT_CREATE),
  validate(serviceIdParamSchema, 'params'),
  serviceController.duplicate,
);

export default router;
