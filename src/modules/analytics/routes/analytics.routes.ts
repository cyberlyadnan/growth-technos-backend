import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Permission } from '@core/constants';
import { authenticate, authorize, validate } from '@core/middlewares';
import { trackPageview, getAnalyticsStats } from '../controller/analytics.controller';
import { statsQuerySchema, trackingSchema } from '../validation/analytics.validation';
const router = Router();
const limiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
router.post('/track', limiter, validate(trackingSchema), trackPageview);
router.post(
  '/events',
  limiter,
  validate(trackingSchema.required({ eventId: true })),
  trackPageview,
);
router.get(
  '/stats',
  authenticate,
  authorize(Permission.ANALYTICS_READ),
  validate(statsQuerySchema, 'query'),
  getAnalyticsStats,
);
export { router as analyticsRoutes };
