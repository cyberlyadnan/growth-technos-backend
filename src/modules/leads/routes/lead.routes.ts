import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize, publicCacheMiddleware, validate } from '@core/middlewares';
import { leadController } from '../controller/lead.controller';
import { magnetRoutes, offerRoutes } from './offer.routes';
import { popupRoutes } from './popup.routes';
import {
  contactWidgetRoutes,
  floatingCtaRoutes,
  stickyCtaRoutes,
  whatsappWidgetRoutes,
  widgetsBundleRoutes,
} from './cta-widget.routes';
import { successMessageRoutes, thankYouRoutes } from './thank-you.routes';
import {
  createLeadFormSchema,
  leadFormIdParamSchema,
  leadFormSlugParamSchema,
  leadIdParamSchema,
  listLeadFormsSchema,
  listLeadsSchema,
  submitLeadSchema,
  updateLeadFormSchema,
  updateLeadSchema,
} from '../validation/lead.validation';

const router = Router();

const PUBLIC_FORM_CACHE_SECONDS = 300;

/** Public: fetch published form definition by slug (crawl-friendly, cacheable) */
router.get(
  '/forms/public/slug/:slug',
  publicCacheMiddleware(PUBLIC_FORM_CACHE_SECONDS),
  validate(leadFormSlugParamSchema, 'params'),
  leadController.getPublicFormBySlug,
);

/** Public: submit a lead against a published form */
router.post('/submit', validate(submitLeadSchema), leadController.submitLead);

/** Conversion chrome (nested routers own public + admin auth) */
router.use('/offers', offerRoutes);
router.use('/magnets', magnetRoutes);
router.use('/popups', popupRoutes);
router.use('/sticky-ctas', stickyCtaRoutes);
router.use('/floating-ctas', floatingCtaRoutes);
router.use('/contact-widgets', contactWidgetRoutes);
router.use('/whatsapp-widgets', whatsappWidgetRoutes);
router.use('/widgets', widgetsBundleRoutes);
router.use('/thank-you-pages', thankYouRoutes);
router.use('/success-messages', successMessageRoutes);

router.use(authenticate);

/** Admin: Lead Forms CRUD */
router.get(
  '/forms',
  authorize(Permission.LEADS_READ),
  validate(listLeadFormsSchema, 'query'),
  leadController.listForms,
);
router.post(
  '/forms',
  authorize(Permission.LEADS_CREATE),
  validate(createLeadFormSchema),
  leadController.createForm,
);
router.get(
  '/forms/:id',
  authorize(Permission.LEADS_READ),
  validate(leadFormIdParamSchema, 'params'),
  leadController.getFormById,
);
router.patch(
  '/forms/:id',
  authorize(Permission.LEADS_UPDATE),
  validate(leadFormIdParamSchema, 'params'),
  validate(updateLeadFormSchema),
  leadController.updateForm,
);
router.delete(
  '/forms/:id',
  authorize(Permission.LEADS_DELETE),
  validate(leadFormIdParamSchema, 'params'),
  leadController.deleteForm,
);
router.post(
  '/forms/:id/restore',
  authorize(Permission.LEADS_UPDATE),
  validate(leadFormIdParamSchema, 'params'),
  leadController.restoreForm,
);
router.post(
  '/forms/:id/publish',
  authorize(Permission.LEADS_UPDATE),
  validate(leadFormIdParamSchema, 'params'),
  leadController.publishForm,
);
router.post(
  '/forms/:id/unpublish',
  authorize(Permission.LEADS_UPDATE),
  validate(leadFormIdParamSchema, 'params'),
  leadController.unpublishForm,
);

/** Admin: Lead inbox */
router.get(
  '/',
  authorize(Permission.LEADS_READ),
  validate(listLeadsSchema, 'query'),
  leadController.listLeads,
);
router.get(
  '/:id',
  authorize(Permission.LEADS_READ),
  validate(leadIdParamSchema, 'params'),
  leadController.getLeadById,
);
router.patch(
  '/:id',
  authorize(Permission.LEADS_UPDATE),
  validate(leadIdParamSchema, 'params'),
  validate(updateLeadSchema),
  leadController.updateLead,
);
router.delete(
  '/:id',
  authorize(Permission.LEADS_DELETE),
  validate(leadIdParamSchema, 'params'),
  leadController.deleteLead,
);

export default router;
