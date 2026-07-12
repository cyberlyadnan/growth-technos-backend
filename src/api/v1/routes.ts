import { Router } from 'express';
import { authRoutes } from '@modules/auth';
import { authorRoutes } from '@modules/authors';
import { blogRoutes } from '@modules/blogs';
import { categoryRoutes } from '@modules/categories';
import { commentRoutes } from '@modules/comments';
import { industryRoutes } from '@modules/industries';
import { mediaRoutes } from '@modules/media';
import { tagRoutes } from '@modules/tags';
import { topicClusterRoutes } from '@modules/topic-clusters';
import { portfolioRoutes } from '@modules/portfolio';
import { serviceRoutes } from '@modules/services';
import { userRoutes } from '@modules/users';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/blogs', blogRoutes);
router.use('/comments', commentRoutes);
router.use('/categories', categoryRoutes);
router.use('/tags', tagRoutes);
router.use('/authors', authorRoutes);
router.use('/topic-clusters', topicClusterRoutes);
router.use('/industries', industryRoutes);
router.use('/services', serviceRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/media', mediaRoutes);
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
