import { Router } from 'express';
import { Permission } from '@core/constants';
import { authorize, validate } from '@core/middlewares';
import { projectController } from '../controller/project.controller';
import {
  addAcceptanceSchema,
  addProjectNoteSchema,
  approveScopeSchema,
  changeRequestParamSchema,
  createChangeRequestSchema,
  createProjectSchema,
  listProjectsSchema,
  projectIdParamSchema,
  resolveChangeRequestSchema,
  transitionProjectStatusSchema,
  updateProjectSchema,
} from '../validation/project.validation';

const router = Router();

router.get(
  '/',
  authorize(Permission.PROJECTS_READ),
  validate(listProjectsSchema, 'query'),
  projectController.list,
);

router.post(
  '/',
  authorize(Permission.PROJECTS_CREATE),
  validate(createProjectSchema),
  projectController.create,
);

router.get(
  '/:id',
  authorize(Permission.PROJECTS_READ),
  validate(projectIdParamSchema, 'params'),
  projectController.getById,
);

router.patch(
  '/:id',
  authorize(Permission.PROJECTS_UPDATE),
  validate(projectIdParamSchema, 'params'),
  validate(updateProjectSchema),
  projectController.update,
);

router.post(
  '/:id/status',
  authorize(Permission.PROJECTS_UPDATE),
  validate(projectIdParamSchema, 'params'),
  validate(transitionProjectStatusSchema),
  projectController.transitionStatus,
);

router.post(
  '/:id/archive',
  authorize(Permission.PROJECTS_UPDATE),
  validate(projectIdParamSchema, 'params'),
  projectController.archive,
);

router.post(
  '/:id/notes',
  authorize(Permission.PROJECTS_UPDATE),
  validate(projectIdParamSchema, 'params'),
  validate(addProjectNoteSchema),
  projectController.addNote,
);

router.post(
  '/:id/approve-scope',
  authorize(Permission.PROJECTS_UPDATE),
  validate(projectIdParamSchema, 'params'),
  validate(approveScopeSchema),
  projectController.approveScope,
);

router.post(
  '/:id/change-requests',
  authorize(Permission.PROJECTS_UPDATE),
  validate(projectIdParamSchema, 'params'),
  validate(createChangeRequestSchema),
  projectController.createChangeRequest,
);

router.post(
  '/:id/change-requests/:key/resolve',
  authorize(Permission.PROJECTS_UPDATE),
  validate(changeRequestParamSchema, 'params'),
  validate(resolveChangeRequestSchema),
  projectController.resolveChangeRequest,
);

router.post(
  '/:id/acceptance',
  authorize(Permission.PROJECTS_UPDATE),
  validate(projectIdParamSchema, 'params'),
  validate(addAcceptanceSchema),
  projectController.addAcceptance,
);

router.post(
  '/:id/restore',
  authorize(Permission.PROJECTS_UPDATE),
  validate(projectIdParamSchema, 'params'),
  projectController.restore,
);

router.delete(
  '/:id',
  authorize(Permission.PROJECTS_DELETE),
  validate(projectIdParamSchema, 'params'),
  projectController.remove,
);

export default router;
