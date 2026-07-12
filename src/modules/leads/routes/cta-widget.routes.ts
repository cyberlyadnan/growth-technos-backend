import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize, publicCacheMiddleware, validate } from '@core/middlewares';
import {
  contactWidgetController,
  floatingCtaController,
  publicWidgetsController,
  stickyCtaController,
  whatsappWidgetController,
} from '../controller/cta-widget.controller';
import {
  contactWidgetIdParamSchema,
  createContactWidgetSchema,
  createFloatingCtaSchema,
  createStickyCtaSchema,
  createWhatsAppWidgetSchema,
  floatingCtaIdParamSchema,
  listContactWidgetsSchema,
  listFloatingCtasSchema,
  listStickyCtasSchema,
  listWhatsAppWidgetsSchema,
  publicWidgetsQuerySchema,
  stickyCtaIdParamSchema,
  updateContactWidgetSchema,
  updateFloatingCtaSchema,
  updateStickyCtaSchema,
  updateWhatsAppWidgetSchema,
  whatsappWidgetIdParamSchema,
} from '../validation/cta-widget.validation';

const PUBLIC_CACHE_SECONDS = 120;

type CrudControllers = {
  list: typeof stickyCtaController.list;
  listPublic: typeof stickyCtaController.listPublic;
  getById: typeof stickyCtaController.getById;
  create: typeof stickyCtaController.create;
  update: typeof stickyCtaController.update;
  remove: typeof stickyCtaController.remove;
  restore: typeof stickyCtaController.restore;
  publish: typeof stickyCtaController.publish;
  unpublish: typeof stickyCtaController.unpublish;
};

function mountCrudRouter(options: {
  controller: CrudControllers;
  createSchema: Parameters<typeof validate>[0];
  updateSchema: Parameters<typeof validate>[0];
  listSchema: Parameters<typeof validate>[0];
  idSchema: Parameters<typeof validate>[0];
  publicSchema: Parameters<typeof validate>[0];
}): Router {
  const router = Router();
  const { controller } = options;

  router.get(
    '/public',
    publicCacheMiddleware(PUBLIC_CACHE_SECONDS),
    validate(options.publicSchema, 'query'),
    controller.listPublic,
  );

  router.use(authenticate);

  router.get('/', authorize(Permission.LEADS_READ), validate(options.listSchema, 'query'), controller.list);
  router.post('/', authorize(Permission.LEADS_CREATE), validate(options.createSchema), controller.create);
  router.get('/:id', authorize(Permission.LEADS_READ), validate(options.idSchema, 'params'), controller.getById);
  router.patch(
    '/:id',
    authorize(Permission.LEADS_UPDATE),
    validate(options.idSchema, 'params'),
    validate(options.updateSchema),
    controller.update,
  );
  router.delete(
    '/:id',
    authorize(Permission.LEADS_DELETE),
    validate(options.idSchema, 'params'),
    controller.remove,
  );
  router.post(
    '/:id/restore',
    authorize(Permission.LEADS_UPDATE),
    validate(options.idSchema, 'params'),
    controller.restore,
  );
  router.post(
    '/:id/publish',
    authorize(Permission.LEADS_UPDATE),
    validate(options.idSchema, 'params'),
    controller.publish,
  );
  router.post(
    '/:id/unpublish',
    authorize(Permission.LEADS_UPDATE),
    validate(options.idSchema, 'params'),
    controller.unpublish,
  );

  return router;
}

export const stickyCtaRoutes = mountCrudRouter({
  controller: stickyCtaController,
  createSchema: createStickyCtaSchema,
  updateSchema: updateStickyCtaSchema,
  listSchema: listStickyCtasSchema,
  idSchema: stickyCtaIdParamSchema,
  publicSchema: publicWidgetsQuerySchema,
});

export const floatingCtaRoutes = mountCrudRouter({
  controller: floatingCtaController,
  createSchema: createFloatingCtaSchema,
  updateSchema: updateFloatingCtaSchema,
  listSchema: listFloatingCtasSchema,
  idSchema: floatingCtaIdParamSchema,
  publicSchema: publicWidgetsQuerySchema,
});

export const contactWidgetRoutes = mountCrudRouter({
  controller: contactWidgetController,
  createSchema: createContactWidgetSchema,
  updateSchema: updateContactWidgetSchema,
  listSchema: listContactWidgetsSchema,
  idSchema: contactWidgetIdParamSchema,
  publicSchema: publicWidgetsQuerySchema,
});

export const whatsappWidgetRoutes = mountCrudRouter({
  controller: whatsappWidgetController,
  createSchema: createWhatsAppWidgetSchema,
  updateSchema: updateWhatsAppWidgetSchema,
  listSchema: listWhatsAppWidgetsSchema,
  idSchema: whatsappWidgetIdParamSchema,
  publicSchema: publicWidgetsQuerySchema,
});

/** Combined public chrome for a page (sticky + floating + contact + whatsapp) */
export const widgetsBundleRoutes = Router();
widgetsBundleRoutes.get(
  '/public',
  publicCacheMiddleware(PUBLIC_CACHE_SECONDS),
  validate(publicWidgetsQuerySchema, 'query'),
  publicWidgetsController.getBundle,
);
