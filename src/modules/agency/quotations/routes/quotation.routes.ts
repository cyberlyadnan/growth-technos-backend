import { Router } from 'express';
import { Permission } from '@core/constants';
import { authorize, validate } from '@core/middlewares';
import { quotationController } from '../controller/quotation.controller';
import {
  addQuotationNoteSchema,
  convertToProjectSchema,
  createCatalogItemSchema,
  createQuotationSchema,
  createTemplateSchema,
  listCatalogItemsSchema,
  listQuotationsSchema,
  listTemplatesSchema,
  previewTotalsSchema,
  quotationIdParamSchema,
  rejectQuotationSchema,
  reviseQuotationSchema,
  updateCatalogItemSchema,
  updateQuotationSchema,
  updateTemplateSchema,
} from '../validation/quotation.validation';

const router = Router();

router.post(
  '/preview-totals',
  authorize(Permission.QUOTATIONS_READ),
  validate(previewTotalsSchema),
  quotationController.previewTotals,
);

router.get(
  '/catalog',
  authorize(Permission.QUOTATIONS_READ),
  validate(listCatalogItemsSchema, 'query'),
  quotationController.listCatalog,
);
router.post(
  '/catalog',
  authorize(Permission.QUOTATIONS_CREATE),
  validate(createCatalogItemSchema),
  quotationController.createCatalogItem,
);
router.patch(
  '/catalog/:id',
  authorize(Permission.QUOTATIONS_UPDATE),
  validate(quotationIdParamSchema, 'params'),
  validate(updateCatalogItemSchema),
  quotationController.updateCatalogItem,
);

router.get(
  '/templates',
  authorize(Permission.QUOTATIONS_READ),
  validate(listTemplatesSchema, 'query'),
  quotationController.listTemplates,
);
router.post(
  '/templates',
  authorize(Permission.QUOTATIONS_CREATE),
  validate(createTemplateSchema),
  quotationController.createTemplate,
);
router.get(
  '/templates/:id',
  authorize(Permission.QUOTATIONS_READ),
  validate(quotationIdParamSchema, 'params'),
  quotationController.getTemplate,
);
router.patch(
  '/templates/:id',
  authorize(Permission.QUOTATIONS_UPDATE),
  validate(quotationIdParamSchema, 'params'),
  validate(updateTemplateSchema),
  quotationController.updateTemplate,
);

router.get(
  '/',
  authorize(Permission.QUOTATIONS_READ),
  validate(listQuotationsSchema, 'query'),
  quotationController.list,
);
router.post(
  '/',
  authorize(Permission.QUOTATIONS_CREATE),
  validate(createQuotationSchema),
  quotationController.create,
);

router.get(
  '/:id',
  authorize(Permission.QUOTATIONS_READ),
  validate(quotationIdParamSchema, 'params'),
  quotationController.getById,
);
router.patch(
  '/:id',
  authorize(Permission.QUOTATIONS_UPDATE),
  validate(quotationIdParamSchema, 'params'),
  validate(updateQuotationSchema),
  quotationController.update,
);
router.post(
  '/:id/issue',
  authorize(Permission.QUOTATIONS_UPDATE),
  validate(quotationIdParamSchema, 'params'),
  quotationController.issue,
);
router.post(
  '/:id/accept',
  authorize(Permission.QUOTATIONS_UPDATE),
  validate(quotationIdParamSchema, 'params'),
  quotationController.accept,
);
router.post(
  '/:id/reject',
  authorize(Permission.QUOTATIONS_UPDATE),
  validate(quotationIdParamSchema, 'params'),
  validate(rejectQuotationSchema),
  quotationController.reject,
);
router.post(
  '/:id/revise',
  authorize(Permission.QUOTATIONS_CREATE),
  validate(quotationIdParamSchema, 'params'),
  validate(reviseQuotationSchema),
  quotationController.revise,
);
router.post(
  '/:id/convert-to-project',
  authorize(Permission.QUOTATIONS_UPDATE, Permission.PROJECTS_CREATE),
  validate(quotationIdParamSchema, 'params'),
  validate(convertToProjectSchema),
  quotationController.convertToProject,
);
router.post(
  '/:id/invoice-ready',
  authorize(Permission.QUOTATIONS_UPDATE),
  validate(quotationIdParamSchema, 'params'),
  quotationController.markInvoiceReady,
);
router.post(
  '/:id/notes',
  authorize(Permission.QUOTATIONS_UPDATE),
  validate(quotationIdParamSchema, 'params'),
  validate(addQuotationNoteSchema),
  quotationController.addNote,
);
router.get(
  '/:id/pdf',
  authorize(Permission.QUOTATIONS_READ),
  validate(quotationIdParamSchema, 'params'),
  quotationController.downloadPdf,
);
router.post(
  '/:id/restore',
  authorize(Permission.QUOTATIONS_UPDATE),
  validate(quotationIdParamSchema, 'params'),
  quotationController.restore,
);
router.delete(
  '/:id',
  authorize(Permission.QUOTATIONS_DELETE),
  validate(quotationIdParamSchema, 'params'),
  quotationController.remove,
);

export default router;
