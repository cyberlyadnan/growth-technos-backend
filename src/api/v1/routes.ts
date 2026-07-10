import { Router } from 'express';
import { authRoutes } from '@modules/auth';

const router = Router();

router.use('/auth', authRoutes);

// Future module routes will be mounted here:
// router.use('/users', userRoutes);
// router.use('/blogs', blogRoutes);
// router.use('/leads', leadRoutes);
// router.use('/crm', crmRoutes);

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    data: { version: 'v1', timestamp: new Date().toISOString() },
    errors: [],
    meta: null,
  });
});

export default router;
