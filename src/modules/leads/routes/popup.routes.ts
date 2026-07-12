import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize, publicCacheMiddleware, validate } from '@core/middlewares';
import { popupController } from '../controller/popup.controller';
import {
  createPopupSchema,
  listPopupsSchema,
  popupIdParamSchema,
  publicPopupsQuerySchema,
  updatePopupSchema,
} from '../validation/popup.validation';

const PUBLIC_CACHE_SECONDS = 120;

export const popupRoutes = Router();

/** Public: contextual popups (client enforces cookie/frequency) */
popupRoutes.get(
  '/public',
  publicCacheMiddleware(PUBLIC_CACHE_SECONDS),
  validate(publicPopupsQuerySchema, 'query'),
  popupController.listPublic,
);

popupRoutes.use(authenticate);

popupRoutes.get(
  '/',
  authorize(Permission.LEADS_READ),
  validate(listPopupsSchema, 'query'),
  popupController.list,
);
popupRoutes.post(
  '/',
  authorize(Permission.LEADS_CREATE),
  validate(createPopupSchema),
  popupController.create,
);
popupRoutes.get(
  '/:id',
  authorize(Permission.LEADS_READ),
  validate(popupIdParamSchema, 'params'),
  popupController.getById,
);
popupRoutes.patch(
  '/:id',
  authorize(Permission.LEADS_UPDATE),
  validate(popupIdParamSchema, 'params'),
  validate(updatePopupSchema),
  popupController.update,
);
popupRoutes.delete(
  '/:id',
  authorize(Permission.LEADS_DELETE),
  validate(popupIdParamSchema, 'params'),
  popupController.remove,
);
popupRoutes.post(
  '/:id/restore',
  authorize(Permission.LEADS_UPDATE),
  validate(popupIdParamSchema, 'params'),
  popupController.restore,
);
popupRoutes.post(
  '/:id/publish',
  authorize(Permission.LEADS_UPDATE),
  validate(popupIdParamSchema, 'params'),
  popupController.publish,
);
popupRoutes.post(
  '/:id/unpublish',
  authorize(Permission.LEADS_UPDATE),
  validate(popupIdParamSchema, 'params'),
  popupController.unpublish,
);
