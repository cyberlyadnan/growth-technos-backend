import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize, publicCacheMiddleware, validate } from '@core/middlewares';
import { portfolioController } from '../controller/portfolio.controller';
import {
  createPortfolioSchema,
  listPortfolioSchema,
  listPublicPortfolioSchema,
  portfolioBulkActionSchema,
  portfolioIdParamSchema,
  portfolioSlugParamSchema,
  schedulePortfolioSchema,
  updatePortfolioSchema,
} from '../validation/portfolio.validation';

const router = Router();

const CMS_LIST_CACHE_SECONDS = 3600;

router.get(
  '/public',
  publicCacheMiddleware(CMS_LIST_CACHE_SECONDS),
  validate(listPublicPortfolioSchema, 'query'),
  portfolioController.listPublished,
);
router.get(
  '/public/slug/:slug',
  publicCacheMiddleware(CMS_LIST_CACHE_SECONDS),
  validate(portfolioSlugParamSchema, 'params'),
  portfolioController.getPublishedBySlug,
);
router.get('/public/feeds', publicCacheMiddleware(CMS_LIST_CACHE_SECONDS), portfolioController.getPublicFeeds);

router.use(authenticate);

router.get(
  '/',
  authorize(Permission.CONTENT_READ),
  validate(listPortfolioSchema, 'query'),
  portfolioController.list,
);
router.post(
  '/bulk',
  authorize(Permission.CONTENT_UPDATE),
  validate(portfolioBulkActionSchema),
  portfolioController.bulkAction,
);
router.post(
  '/',
  authorize(Permission.CONTENT_CREATE),
  validate(createPortfolioSchema),
  portfolioController.create,
);
router.get(
  '/:id',
  authorize(Permission.CONTENT_READ),
  validate(portfolioIdParamSchema, 'params'),
  portfolioController.getById,
);
router.patch(
  '/:id',
  authorize(Permission.CONTENT_UPDATE),
  validate(portfolioIdParamSchema, 'params'),
  validate(updatePortfolioSchema),
  portfolioController.update,
);
router.delete(
  '/:id',
  authorize(Permission.CONTENT_DELETE),
  validate(portfolioIdParamSchema, 'params'),
  portfolioController.remove,
);
router.delete(
  '/:id/permanent',
  authorize(Permission.CONTENT_DELETE),
  validate(portfolioIdParamSchema, 'params'),
  portfolioController.permanentDelete,
);
router.post(
  '/:id/restore',
  authorize(Permission.CONTENT_UPDATE),
  validate(portfolioIdParamSchema, 'params'),
  portfolioController.restore,
);
router.post(
  '/:id/publish',
  authorize(Permission.CONTENT_PUBLISH),
  validate(portfolioIdParamSchema, 'params'),
  portfolioController.publish,
);
router.post(
  '/:id/unpublish',
  authorize(Permission.CONTENT_PUBLISH),
  validate(portfolioIdParamSchema, 'params'),
  portfolioController.unpublish,
);
router.post(
  '/:id/schedule',
  authorize(Permission.CONTENT_PUBLISH),
  validate(portfolioIdParamSchema, 'params'),
  validate(schedulePortfolioSchema),
  portfolioController.schedule,
);
router.post(
  '/:id/archive',
  authorize(Permission.CONTENT_PUBLISH),
  validate(portfolioIdParamSchema, 'params'),
  portfolioController.archive,
);
router.post(
  '/:id/duplicate',
  authorize(Permission.CONTENT_CREATE),
  validate(portfolioIdParamSchema, 'params'),
  portfolioController.duplicate,
);

export default router;
