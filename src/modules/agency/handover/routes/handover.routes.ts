import { Router } from 'express';
import { Permission } from '@core/constants';
import { authorize, validate } from '@core/middlewares';
import { handoverController } from '../controller/handover.controller';
import {
  createHandoverSchema,
  handoverIdParamSchema,
  listHandoversSchema,
  updateChecklistItemSchema,
  updateHandoverSchema,
} from '../validation/handover.validation';

const router = Router();

router.get(
  '/',
  authorize(Permission.PROJECTS_READ),
  validate(listHandoversSchema, 'query'),
  handoverController.list,
);
router.post(
  '/',
  authorize(Permission.PROJECTS_UPDATE),
  validate(createHandoverSchema),
  handoverController.create,
);
router.get(
  '/:id/pdf',
  authorize(Permission.PROJECTS_READ),
  validate(handoverIdParamSchema, 'params'),
  handoverController.pdf,
);
router.get(
  '/:id',
  authorize(Permission.PROJECTS_READ),
  validate(handoverIdParamSchema, 'params'),
  handoverController.getById,
);
router.patch(
  '/:id',
  authorize(Permission.PROJECTS_UPDATE),
  validate(handoverIdParamSchema, 'params'),
  validate(updateHandoverSchema),
  handoverController.update,
);
router.post(
  '/:id/checklist-items',
  authorize(Permission.PROJECTS_UPDATE),
  validate(handoverIdParamSchema, 'params'),
  validate(updateChecklistItemSchema),
  handoverController.updateChecklistItem,
);
router.post(
  '/:id/complete',
  authorize(Permission.PROJECTS_UPDATE),
  validate(handoverIdParamSchema, 'params'),
  handoverController.complete,
);

export default router;
