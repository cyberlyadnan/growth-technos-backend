import { Router } from 'express';
import { authenticate, requireAdmin, validate } from '@core/middlewares';
import { userController } from '../controller/user.controller';
import {
  adminUserIdSchema,
  createAdminUserSchema,
  listAdminUsersSchema,
  resetAdminPasswordSchema,
  updateAdminUserSchema,
} from '../validation/user.validation';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', validate(listAdminUsersSchema, 'query'), userController.list);
router.get('/:id', validate(adminUserIdSchema, 'params'), userController.getById);
router.post('/', validate(createAdminUserSchema), userController.create);
router.patch(
  '/:id',
  validate(adminUserIdSchema, 'params'),
  validate(updateAdminUserSchema),
  userController.update,
);
router.patch(
  '/:id/reset-password',
  validate(adminUserIdSchema, 'params'),
  validate(resetAdminPasswordSchema),
  userController.resetPassword,
);
router.delete('/:id', validate(adminUserIdSchema, 'params'), userController.remove);

export default router;
