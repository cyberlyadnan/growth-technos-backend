import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize, publicCacheMiddleware, validate } from '@core/middlewares';
import {
  successMessageController,
  thankYouPageController,
} from '../controller/thank-you.controller';
import {
  createSuccessMessageSchema,
  createThankYouPageSchema,
  listSuccessMessagesSchema,
  listThankYouPagesSchema,
  successMessageIdParamSchema,
  thankYouIdParamSchema,
  thankYouSlugParamSchema,
  updateSuccessMessageSchema,
  updateThankYouPageSchema,
} from '../validation/thank-you.validation';

const PUBLIC_CACHE_SECONDS = 300;

export const thankYouRoutes = Router();

thankYouRoutes.get(
  '/public/slug/:slug',
  publicCacheMiddleware(PUBLIC_CACHE_SECONDS),
  validate(thankYouSlugParamSchema, 'params'),
  thankYouPageController.getPublicBySlug,
);

thankYouRoutes.use(authenticate);

thankYouRoutes.get(
  '/',
  authorize(Permission.LEADS_READ),
  validate(listThankYouPagesSchema, 'query'),
  thankYouPageController.list,
);
thankYouRoutes.post(
  '/',
  authorize(Permission.LEADS_CREATE),
  validate(createThankYouPageSchema),
  thankYouPageController.create,
);
thankYouRoutes.get(
  '/:id',
  authorize(Permission.LEADS_READ),
  validate(thankYouIdParamSchema, 'params'),
  thankYouPageController.getById,
);
thankYouRoutes.patch(
  '/:id',
  authorize(Permission.LEADS_UPDATE),
  validate(thankYouIdParamSchema, 'params'),
  validate(updateThankYouPageSchema),
  thankYouPageController.update,
);
thankYouRoutes.delete(
  '/:id',
  authorize(Permission.LEADS_DELETE),
  validate(thankYouIdParamSchema, 'params'),
  thankYouPageController.remove,
);
thankYouRoutes.post(
  '/:id/restore',
  authorize(Permission.LEADS_UPDATE),
  validate(thankYouIdParamSchema, 'params'),
  thankYouPageController.restore,
);
thankYouRoutes.post(
  '/:id/publish',
  authorize(Permission.LEADS_UPDATE),
  validate(thankYouIdParamSchema, 'params'),
  thankYouPageController.publish,
);
thankYouRoutes.post(
  '/:id/unpublish',
  authorize(Permission.LEADS_UPDATE),
  validate(thankYouIdParamSchema, 'params'),
  thankYouPageController.unpublish,
);

export const successMessageRoutes = Router();

successMessageRoutes.use(authenticate);

successMessageRoutes.get(
  '/',
  authorize(Permission.LEADS_READ),
  validate(listSuccessMessagesSchema, 'query'),
  successMessageController.list,
);
successMessageRoutes.post(
  '/',
  authorize(Permission.LEADS_CREATE),
  validate(createSuccessMessageSchema),
  successMessageController.create,
);
successMessageRoutes.get(
  '/:id',
  authorize(Permission.LEADS_READ),
  validate(successMessageIdParamSchema, 'params'),
  successMessageController.getById,
);
successMessageRoutes.patch(
  '/:id',
  authorize(Permission.LEADS_UPDATE),
  validate(successMessageIdParamSchema, 'params'),
  validate(updateSuccessMessageSchema),
  successMessageController.update,
);
successMessageRoutes.delete(
  '/:id',
  authorize(Permission.LEADS_DELETE),
  validate(successMessageIdParamSchema, 'params'),
  successMessageController.remove,
);
successMessageRoutes.post(
  '/:id/restore',
  authorize(Permission.LEADS_UPDATE),
  validate(successMessageIdParamSchema, 'params'),
  successMessageController.restore,
);
successMessageRoutes.post(
  '/:id/publish',
  authorize(Permission.LEADS_UPDATE),
  validate(successMessageIdParamSchema, 'params'),
  successMessageController.publish,
);
successMessageRoutes.post(
  '/:id/unpublish',
  authorize(Permission.LEADS_UPDATE),
  validate(successMessageIdParamSchema, 'params'),
  successMessageController.unpublish,
);
