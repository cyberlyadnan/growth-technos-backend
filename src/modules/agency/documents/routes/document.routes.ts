import { Router } from 'express';
import { Permission } from '@core/constants';
import { authorize, validate } from '@core/middlewares';
import { documentController } from '../controller/document.controller';
import { uploadAgencyDocument } from '../middleware/document-upload.middleware';
import {
  documentIdParamSchema,
  listDocumentsSchema,
  updateDocumentSchema,
  uploadDocumentMetaSchema,
} from '../validation/document.validation';

const router = Router();

router.get(
  '/',
  authorize(Permission.DOCUMENTS_READ),
  validate(listDocumentsSchema, 'query'),
  documentController.list,
);
router.post(
  '/',
  authorize(Permission.DOCUMENTS_CREATE),
  uploadAgencyDocument,
  validate(uploadDocumentMetaSchema),
  documentController.upload,
);
router.get(
  '/:id/download',
  authorize(Permission.DOCUMENTS_READ),
  validate(documentIdParamSchema, 'params'),
  documentController.download,
);
router.get(
  '/:id',
  authorize(Permission.DOCUMENTS_READ),
  validate(documentIdParamSchema, 'params'),
  documentController.getById,
);
router.patch(
  '/:id',
  authorize(Permission.DOCUMENTS_UPDATE),
  validate(documentIdParamSchema, 'params'),
  validate(updateDocumentSchema),
  documentController.update,
);
router.delete(
  '/:id',
  authorize(Permission.DOCUMENTS_DELETE),
  validate(documentIdParamSchema, 'params'),
  documentController.remove,
);

export default router;
