import { Router } from 'express';
import {
  authenticate,
  requireAdmin,
  guestOnly,
  authRateLimiter,
  validate,
} from '@core/middlewares';
import { authController } from '../controller/auth.controller';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  updateAvatarSchema,
} from '../validation/auth.validation';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & session management
 */

// Guest routes — accessible when not authenticated
router.post('/login', authRateLimiter, guestOnly, validate(loginSchema), authController.login);
router.post(
  '/forgot-password',
  authRateLimiter,
  guestOnly,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  authRateLimiter,
  guestOnly,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

// Public session refresh (uses refresh token cookie/body)
router.post('/refresh', authRateLimiter, validate(refreshTokenSchema), authController.refresh);
router.post('/logout', authController.logout);

// Protected routes — require valid access token
router.get('/me', authenticate, authController.me);
router.get('/session', authenticate, authController.session);
router.post('/logout-all', authenticate, authController.logoutAll);
router.patch(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);
router.patch('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.patch(
  '/profile/avatar',
  authenticate,
  validate(updateAvatarSchema),
  authController.updateAvatar,
);

// Admin-only — create additional admin accounts
router.post(
  '/register',
  authRateLimiter,
  authenticate,
  requireAdmin,
  validate(registerSchema),
  authController.register,
);

export default router;
