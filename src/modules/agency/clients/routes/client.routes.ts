import { Router } from 'express';
import { Permission } from '@core/constants';
import { authorize, validate } from '@core/middlewares';
import { clientController } from '../controller/client.controller';
import {
  addClientNoteSchema,
  clientIdParamSchema,
  convertLeadToClientSchema,
  createClientSchema,
  listClientsSchema,
  updateClientSchema,
} from '../validation/client.validation';
import { z } from 'zod';
import { mongoIdSchema } from '@core/validation/common.validation';

const leadIdParamSchema = z.object({
  leadId: mongoIdSchema,
});

const router = Router();

router.get('/', authorize(Permission.CLIENTS_READ), validate(listClientsSchema, 'query'), clientController.list);

router.post('/', authorize(Permission.CLIENTS_CREATE), validate(createClientSchema), clientController.create);

router.post(
  '/convert-from-lead/:leadId',
  authorize(Permission.CLIENTS_CREATE, Permission.LEADS_UPDATE),
  validate(leadIdParamSchema, 'params'),
  validate(convertLeadToClientSchema),
  clientController.convertFromLead,
);

router.get(
  '/:id',
  authorize(Permission.CLIENTS_READ),
  validate(clientIdParamSchema, 'params'),
  clientController.getById,
);

router.patch(
  '/:id',
  authorize(Permission.CLIENTS_UPDATE),
  validate(clientIdParamSchema, 'params'),
  validate(updateClientSchema),
  clientController.update,
);

router.post(
  '/:id/archive',
  authorize(Permission.CLIENTS_UPDATE),
  validate(clientIdParamSchema, 'params'),
  clientController.archive,
);

router.post(
  '/:id/notes',
  authorize(Permission.CLIENTS_UPDATE),
  validate(clientIdParamSchema, 'params'),
  validate(addClientNoteSchema),
  clientController.addNote,
);

router.post(
  '/:id/restore',
  authorize(Permission.CLIENTS_UPDATE),
  validate(clientIdParamSchema, 'params'),
  clientController.restore,
);

router.delete(
  '/:id',
  authorize(Permission.CLIENTS_DELETE),
  validate(clientIdParamSchema, 'params'),
  clientController.remove,
);

export default router;
