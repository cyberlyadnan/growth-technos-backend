import { Router } from 'express';
import { Permission } from '@core/constants';
import { authorize, validate } from '@core/middlewares';
import { mongoIdParamSchema } from '@core/validation/common.validation';
import { documentController } from '@modules/agency/documents/controller/document.controller';
import { listActivitySchema } from '@modules/agency/documents/validation/document.validation';

const router = Router();

router.get(
  '/',
  authorize(Permission.AGENCY_READ),
  validate(listActivitySchema, 'query'),
  documentController.listActivity,
);
router.get(
  '/:id',
  authorize(Permission.AGENCY_READ),
  validate(mongoIdParamSchema, 'params'),
  documentController.getActivity,
);
router.patch(
  '/:id',
  authorize(Permission.AGENCY_READ),
  validate(mongoIdParamSchema, 'params'),
  documentController.mutateActivityForbidden,
);
router.delete(
  '/:id',
  authorize(Permission.AGENCY_READ),
  validate(mongoIdParamSchema, 'params'),
  documentController.mutateActivityForbidden,
);

export default router;
