import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize, publicCacheMiddleware, validate } from '@core/middlewares';
import { offerController, leadMagnetController } from '../controller/offer.controller';
import {
  createLeadMagnetSchema,
  createOfferSchema,
  leadMagnetIdParamSchema,
  listLeadMagnetsSchema,
  listOffersSchema,
  offerIdParamSchema,
  publicMagnetsQuerySchema,
  publicOffersQuerySchema,
  updateLeadMagnetSchema,
  updateOfferSchema,
} from '../validation/offer.validation';

const PUBLIC_CACHE_SECONDS = 300;

export const offerRoutes = Router();

offerRoutes.get(
  '/public',
  publicCacheMiddleware(PUBLIC_CACHE_SECONDS),
  validate(publicOffersQuerySchema, 'query'),
  offerController.listPublic,
);

offerRoutes.use(authenticate);

offerRoutes.get(
  '/',
  authorize(Permission.LEADS_READ),
  validate(listOffersSchema, 'query'),
  offerController.list,
);
offerRoutes.post(
  '/',
  authorize(Permission.LEADS_CREATE),
  validate(createOfferSchema),
  offerController.create,
);
offerRoutes.get(
  '/:id',
  authorize(Permission.LEADS_READ),
  validate(offerIdParamSchema, 'params'),
  offerController.getById,
);
offerRoutes.patch(
  '/:id',
  authorize(Permission.LEADS_UPDATE),
  validate(offerIdParamSchema, 'params'),
  validate(updateOfferSchema),
  offerController.update,
);
offerRoutes.delete(
  '/:id',
  authorize(Permission.LEADS_DELETE),
  validate(offerIdParamSchema, 'params'),
  offerController.remove,
);
offerRoutes.post(
  '/:id/restore',
  authorize(Permission.LEADS_UPDATE),
  validate(offerIdParamSchema, 'params'),
  offerController.restore,
);
offerRoutes.post(
  '/:id/publish',
  authorize(Permission.LEADS_UPDATE),
  validate(offerIdParamSchema, 'params'),
  offerController.publish,
);
offerRoutes.post(
  '/:id/unpublish',
  authorize(Permission.LEADS_UPDATE),
  validate(offerIdParamSchema, 'params'),
  offerController.unpublish,
);

export const magnetRoutes = Router();

magnetRoutes.get(
  '/public',
  publicCacheMiddleware(PUBLIC_CACHE_SECONDS),
  validate(publicMagnetsQuerySchema, 'query'),
  leadMagnetController.listPublic,
);

magnetRoutes.use(authenticate);

magnetRoutes.get(
  '/',
  authorize(Permission.LEADS_READ),
  validate(listLeadMagnetsSchema, 'query'),
  leadMagnetController.list,
);
magnetRoutes.post(
  '/',
  authorize(Permission.LEADS_CREATE),
  validate(createLeadMagnetSchema),
  leadMagnetController.create,
);
magnetRoutes.get(
  '/:id',
  authorize(Permission.LEADS_READ),
  validate(leadMagnetIdParamSchema, 'params'),
  leadMagnetController.getById,
);
magnetRoutes.patch(
  '/:id',
  authorize(Permission.LEADS_UPDATE),
  validate(leadMagnetIdParamSchema, 'params'),
  validate(updateLeadMagnetSchema),
  leadMagnetController.update,
);
magnetRoutes.delete(
  '/:id',
  authorize(Permission.LEADS_DELETE),
  validate(leadMagnetIdParamSchema, 'params'),
  leadMagnetController.remove,
);
magnetRoutes.post(
  '/:id/restore',
  authorize(Permission.LEADS_UPDATE),
  validate(leadMagnetIdParamSchema, 'params'),
  leadMagnetController.restore,
);
magnetRoutes.post(
  '/:id/publish',
  authorize(Permission.LEADS_UPDATE),
  validate(leadMagnetIdParamSchema, 'params'),
  leadMagnetController.publish,
);
magnetRoutes.post(
  '/:id/unpublish',
  authorize(Permission.LEADS_UPDATE),
  validate(leadMagnetIdParamSchema, 'params'),
  leadMagnetController.unpublish,
);
