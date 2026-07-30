import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize, publicCacheMiddleware, validate } from '@core/middlewares';
import { testimonialController } from '../controller/testimonial.controller';
import {
  createTestimonialSchema,
  listPublicTestimonialSchema,
  listTestimonialSchema,
  testimonialIdParamSchema,
  updateTestimonialSchema,
} from '../validation/testimonial.validation';

const router = Router();
const CMS_LIST_CACHE_SECONDS = 3600;

router.get(
  '/public',
  publicCacheMiddleware(CMS_LIST_CACHE_SECONDS),
  validate(listPublicTestimonialSchema, 'query'),
  testimonialController.listPublic,
);

router.use(authenticate);

router.get(
  '/',
  authorize(Permission.CONTENT_READ),
  validate(listTestimonialSchema, 'query'),
  testimonialController.list,
);
router.post(
  '/',
  authorize(Permission.CONTENT_CREATE),
  validate(createTestimonialSchema),
  testimonialController.create,
);
router.get(
  '/:id',
  authorize(Permission.CONTENT_READ),
  validate(testimonialIdParamSchema, 'params'),
  testimonialController.getById,
);
router.patch(
  '/:id',
  authorize(Permission.CONTENT_UPDATE),
  validate(testimonialIdParamSchema, 'params'),
  validate(updateTestimonialSchema),
  testimonialController.update,
);
router.delete(
  '/:id',
  authorize(Permission.CONTENT_DELETE),
  validate(testimonialIdParamSchema, 'params'),
  testimonialController.remove,
);
router.post(
  '/:id/restore',
  authorize(Permission.CONTENT_UPDATE),
  validate(testimonialIdParamSchema, 'params'),
  testimonialController.restore,
);
router.delete(
  '/:id/permanent',
  authorize(Permission.CONTENT_DELETE),
  validate(testimonialIdParamSchema, 'params'),
  testimonialController.permanentDelete,
);

export default router;
