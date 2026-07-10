import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize, validate } from '@core/middlewares';
import { createTaxonomyController } from './taxonomy.controller';
import { TaxonomyService } from './taxonomy.service';
import {
  createTaxonomySchema,
  listTaxonomySchema,
  taxonomyIdParamSchema,
  updateTaxonomySchema,
} from './taxonomy.validation';

export function createTaxonomyRoutes(service: TaxonomyService<never>) {
  const router = Router();
  const controller = createTaxonomyController(service);

  router.use(authenticate);

  router.get(
    '/',
    authorize(Permission.CONTENT_READ),
    validate(listTaxonomySchema, 'query'),
    controller.list,
  );
  router.post(
    '/',
    authorize(Permission.CONTENT_CREATE),
    validate(createTaxonomySchema),
    controller.create,
  );
  router.get(
    '/:id',
    authorize(Permission.CONTENT_READ),
    validate(taxonomyIdParamSchema, 'params'),
    controller.getById,
  );
  router.patch(
    '/:id',
    authorize(Permission.CONTENT_UPDATE),
    validate(taxonomyIdParamSchema, 'params'),
    validate(updateTaxonomySchema),
    controller.update,
  );
  router.delete(
    '/:id',
    authorize(Permission.CONTENT_DELETE),
    validate(taxonomyIdParamSchema, 'params'),
    controller.remove,
  );
  router.post(
    '/:id/restore',
    authorize(Permission.CONTENT_UPDATE),
    validate(taxonomyIdParamSchema, 'params'),
    controller.restore,
  );
  router.delete(
    '/:id/permanent',
    authorize(Permission.CONTENT_DELETE),
    validate(taxonomyIdParamSchema, 'params'),
    controller.permanentDelete,
  );

  return router;
}
