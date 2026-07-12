import { Router } from 'express';
import { Permission } from '@core/constants';
import {
  authenticate,
  authorize,
  commentRateLimiter,
  optionalAuthenticate,
  publicCacheMiddleware,
  validate,
} from '@core/middlewares';
import { commentController } from '@modules/comments/controller/comment.controller';
import {
  blogIdParamSchema,
  createCommentSchema,
} from '@modules/comments/validation/comment.validation';
import { blogController } from '../controller/blog.controller';
import {
  autosaveBlogSchema,
  blogBulkActionSchema,
  blogIdParamSchema as blogRouteIdParamSchema,
  blogSlugParamSchema,
  createBlogSchema,
  listBlogsSchema,
  listPublicBlogsSchema,
  scheduleBlogSchema,
  updateBlogSchema,
} from '../validation/blog.validation';

const router = Router();

router.get(
  '/public',
  publicCacheMiddleware(),
  validate(listPublicBlogsSchema, 'query'),
  blogController.listPublished,
);
router.get(
  '/public/slug/:slug',
  publicCacheMiddleware(),
  validate(blogSlugParamSchema, 'params'),
  blogController.getPublishedBySlug,
);
router.get('/public/feeds', publicCacheMiddleware(), blogController.getPublicFeeds);

router.get(
  '/:id/comments',
  optionalAuthenticate,
  validate(blogIdParamSchema, 'params'),
  commentController.listForBlog,
);
router.post(
  '/:id/comments',
  commentRateLimiter,
  optionalAuthenticate,
  validate(blogIdParamSchema, 'params'),
  validate(createCommentSchema),
  commentController.createForBlog,
);

router.use(authenticate);

router.get(
  '/',
  authorize(Permission.CONTENT_READ),
  validate(listBlogsSchema, 'query'),
  blogController.list,
);
router.post(
  '/bulk',
  authorize(Permission.CONTENT_UPDATE),
  validate(blogBulkActionSchema),
  blogController.bulkAction,
);
router.post(
  '/',
  authorize(Permission.CONTENT_CREATE),
  validate(createBlogSchema),
  blogController.create,
);
router.get(
  '/:id',
  authorize(Permission.CONTENT_READ),
  validate(blogRouteIdParamSchema, 'params'),
  blogController.getById,
);
router.patch(
  '/:id',
  authorize(Permission.CONTENT_UPDATE),
  validate(blogRouteIdParamSchema, 'params'),
  validate(updateBlogSchema),
  blogController.update,
);
router.patch(
  '/:id/autosave',
  authorize(Permission.CONTENT_UPDATE),
  validate(blogRouteIdParamSchema, 'params'),
  validate(autosaveBlogSchema),
  blogController.autosave,
);
router.delete(
  '/:id',
  authorize(Permission.CONTENT_DELETE),
  validate(blogRouteIdParamSchema, 'params'),
  blogController.remove,
);
router.delete(
  '/:id/permanent',
  authorize(Permission.CONTENT_DELETE),
  validate(blogRouteIdParamSchema, 'params'),
  blogController.permanentDelete,
);
router.post(
  '/:id/restore',
  authorize(Permission.CONTENT_UPDATE),
  validate(blogRouteIdParamSchema, 'params'),
  blogController.restore,
);
router.post(
  '/:id/publish',
  authorize(Permission.CONTENT_PUBLISH),
  validate(blogRouteIdParamSchema, 'params'),
  blogController.publish,
);
router.post(
  '/:id/unpublish',
  authorize(Permission.CONTENT_PUBLISH),
  validate(blogRouteIdParamSchema, 'params'),
  blogController.unpublish,
);
router.post(
  '/:id/schedule',
  authorize(Permission.CONTENT_PUBLISH),
  validate(blogRouteIdParamSchema, 'params'),
  validate(scheduleBlogSchema),
  blogController.schedule,
);
router.post(
  '/:id/archive',
  authorize(Permission.CONTENT_PUBLISH),
  validate(blogRouteIdParamSchema, 'params'),
  blogController.archive,
);
router.post(
  '/:id/duplicate',
  authorize(Permission.CONTENT_CREATE),
  validate(blogRouteIdParamSchema, 'params'),
  blogController.duplicate,
);

export default router;
