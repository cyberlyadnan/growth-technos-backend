import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize, publicCacheMiddleware, validate } from '@core/middlewares';
import { createTaxonomyController } from '@modules/shared/taxonomy/taxonomy.controller';
import {
  listPublicTaxonomySchema,
  listTaxonomySchema,
  taxonomyIdParamSchema,
} from '@modules/shared/taxonomy/taxonomy.validation';
import { tagService } from '../service/tag.service';
import { createTagSchema, updateTagSchema } from '../validation/tag.validation';

const router = Router();
const controller = createTaxonomyController(tagService as never);

router.get('/public', publicCacheMiddleware(), validate(listPublicTaxonomySchema, 'query'), controller.listPublic);

router.use(authenticate);

router.get('/', authorize(Permission.CONTENT_READ), validate(listTaxonomySchema, 'query'), controller.list);
router.post('/', authorize(Permission.CONTENT_CREATE), validate(createTagSchema), controller.create);
router.get('/:id', authorize(Permission.CONTENT_READ), validate(taxonomyIdParamSchema, 'params'), controller.getById);
router.patch(
  '/:id',
  authorize(Permission.CONTENT_UPDATE),
  validate(taxonomyIdParamSchema, 'params'),
  validate(updateTagSchema),
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
