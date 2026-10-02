import { Router } from 'express';
import { trackPageview, getAnalyticsStats } from '../controller/analytics.controller';
import { authenticate, requireAdmin } from '@core/middlewares';

const router = Router();

// Public route for tracking (called by frontend layout)
router.post('/track', trackPageview);

// Protected route for dashboard
router.get('/stats', authenticate, requireAdmin, getAnalyticsStats);

export { router as analyticsRoutes };
