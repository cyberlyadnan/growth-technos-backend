import { Router } from 'express';
import { Permission } from '@core/constants';
import { authorize, validate } from '@core/middlewares';
import { maintenanceController } from '../controller/maintenance.controller';
import {
  addWorkLogSchema,
  agreementIdParamSchema,
  createAgreementSchema,
  createSupportSchema,
  generateBillingSchema,
  listAgreementsSchema,
  listSupportSchema,
  supportIdParamSchema,
  terminateAgreementSchema,
  updateAgreementSchema,
  updateSupportSchema,
} from '../validation/maintenance.validation';

const router = Router();

router.get(
  '/renewal-alerts',
  authorize(Permission.MAINTENANCE_READ),
  maintenanceController.renewalAlerts,
);

router.get(
  '/agreements',
  authorize(Permission.MAINTENANCE_READ),
  validate(listAgreementsSchema, 'query'),
  maintenanceController.listAgreements,
);
router.post(
  '/agreements',
  authorize(Permission.MAINTENANCE_CREATE),
  validate(createAgreementSchema),
  maintenanceController.createAgreement,
);
router.get(
  '/agreements/:id',
  authorize(Permission.MAINTENANCE_READ),
  validate(agreementIdParamSchema, 'params'),
  maintenanceController.getAgreement,
);
router.patch(
  '/agreements/:id',
  authorize(Permission.MAINTENANCE_UPDATE),
  validate(agreementIdParamSchema, 'params'),
  validate(updateAgreementSchema),
  maintenanceController.updateAgreement,
);
router.post(
  '/agreements/:id/activate',
  authorize(Permission.MAINTENANCE_UPDATE),
  validate(agreementIdParamSchema, 'params'),
  maintenanceController.activateAgreement,
);
router.post(
  '/agreements/:id/terminate',
  authorize(Permission.MAINTENANCE_UPDATE),
  validate(agreementIdParamSchema, 'params'),
  validate(terminateAgreementSchema),
  maintenanceController.terminateAgreement,
);
router.get(
  '/agreements/:id/schedules',
  authorize(Permission.MAINTENANCE_READ),
  validate(agreementIdParamSchema, 'params'),
  maintenanceController.listSchedules,
);
router.post(
  '/agreements/:id/generate-draft-invoice',
  authorize(Permission.MAINTENANCE_UPDATE, Permission.INVOICES_CREATE),
  validate(agreementIdParamSchema, 'params'),
  validate(generateBillingSchema),
  maintenanceController.generateDraft,
);

router.get(
  '/support',
  authorize(Permission.MAINTENANCE_READ),
  validate(listSupportSchema, 'query'),
  maintenanceController.listSupport,
);
router.post(
  '/support',
  authorize(Permission.MAINTENANCE_CREATE),
  validate(createSupportSchema),
  maintenanceController.createSupport,
);
router.get(
  '/support/:id',
  authorize(Permission.MAINTENANCE_READ),
  validate(supportIdParamSchema, 'params'),
  maintenanceController.getSupport,
);
router.patch(
  '/support/:id',
  authorize(Permission.MAINTENANCE_UPDATE),
  validate(supportIdParamSchema, 'params'),
  validate(updateSupportSchema),
  maintenanceController.updateSupport,
);
router.post(
  '/support/:id/work-logs',
  authorize(Permission.MAINTENANCE_UPDATE),
  validate(supportIdParamSchema, 'params'),
  validate(addWorkLogSchema),
  maintenanceController.addWorkLog,
);

export default router;
