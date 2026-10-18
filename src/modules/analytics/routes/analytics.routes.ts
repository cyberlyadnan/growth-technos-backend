import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize } from '@core/middlewares';
import { trackPageview, getAnalyticsStats } from '../controller/analytics.controller';

const router = Router();

// Public route for tracking (called by frontend layout)
router.post('/track', trackPageview);

// Marketing-safe pageview statistics (no agency/financial data)
router.get('/stats', authenticate, authorize(Permission.ANALYTICS_READ), getAnalyticsStats);

export { router as analyticsRoutes };
