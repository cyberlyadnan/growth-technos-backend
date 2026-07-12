import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize, publicCacheMiddleware, validate } from '@core/middlewares';
import { asyncHandler, sendSuccess } from '@core/response';
import { createTaxonomyController } from '@modules/shared/taxonomy/taxonomy.controller';
import {
  listPublicTaxonomySchema,
  listTaxonomySchema,
  taxonomyIdParamSchema,
  taxonomySlugParamSchema,
} from '@modules/shared/taxonomy/taxonomy.validation';
import { industryService } from '../service/industry.service';
import { createIndustrySchema, updateIndustrySchema } from '../validation/industry.validation';

const router = Router();
const controller = createTaxonomyController(industryService as never);

const CMS_LIST_CACHE_SECONDS = 3600;

router.get(
  '/public',
  publicCacheMiddleware(CMS_LIST_CACHE_SECONDS),
  validate(listPublicTaxonomySchema, 'query'),
  controller.listPublic,
);
router.get(
  '/public/slug/:slug',
  publicCacheMiddleware(CMS_LIST_CACHE_SECONDS),
  validate(taxonomySlugParamSchema, 'params'),
  controller.getPublicBySlug,
);
router.get(
  '/public/feeds',
  publicCacheMiddleware(CMS_LIST_CACHE_SECONDS),
  asyncHandler(async (_req, res) => {
    const feeds = await industryService.getPublicFeeds();
    sendSuccess(res, feeds);
  }),
);

router.use(authenticate);

router.get('/', authorize(Permission.CONTENT_READ), validate(listTaxonomySchema, 'query'), controller.list);
router.post('/', authorize(Permission.CONTENT_CREATE), validate(createIndustrySchema), controller.create);
router.get('/:id', authorize(Permission.CONTENT_READ), validate(taxonomyIdParamSchema, 'params'), controller.getById);
router.patch(
  '/:id',
  authorize(Permission.CONTENT_UPDATE),
  validate(taxonomyIdParamSchema, 'params'),
  validate(updateIndustrySchema),
  controller.update,
);
router.delete('/:id', authorize(Permission.CONTENT_DELETE), validate(taxonomyIdParamSchema, 'params'), controller.remove);
router.post('/:id/restore', authorize(Permission.CONTENT_UPDATE), validate(taxonomyIdParamSchema, 'params'), controller.restore);
router.delete(
  '/:id/permanent',
  authorize(Permission.CONTENT_DELETE),
  validate(taxonomyIdParamSchema, 'params'),
  controller.permanentDelete,
);

export default router;
