import { Router } from 'express';
import {
  authenticate,
  authorize,
  authRateLimiter,
  validate,
} from '@core/middlewares';
import { Permission } from '@core/constants';
import { authController } from '../controller/auth.controller';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from '../validation/auth.validation';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & session management
 */

router.post('/register', authRateLimiter, authenticate, authorize(Permission.USERS_CREATE), validate(registerSchema), authController.register);
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authRateLimiter, validate(refreshTokenSchema), authController.refresh);
router.post('/logout', authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.me);
router.patch('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
