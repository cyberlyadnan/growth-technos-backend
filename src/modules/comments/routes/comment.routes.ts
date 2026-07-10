import { Router } from 'express';
import { Permission } from '@core/constants';
import {
  authenticate,
  authorize,
  commentRateLimiter,
  optionalAuthenticate,
  validate,
} from '@core/middlewares';
import { commentController } from '../controller/comment.controller';
import {
  commentIdParamSchema,
  listCommentsSchema,
  moderateCommentSchema,
  reportCommentSchema,
  updateCommentSchema,
} from '../validation/comment.validation';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize(Permission.CONTENT_READ),
  validate(listCommentsSchema, 'query'),
  commentController.listAdmin,
);

router.patch(
  '/:id',
  optionalAuthenticate,
  validate(commentIdParamSchema, 'params'),
  validate(updateCommentSchema),
  commentController.update,
);

router.post(
  '/:id/like',
  commentRateLimiter,
  optionalAuthenticate,
  validate(commentIdParamSchema, 'params'),
  commentController.like,
);

router.post(
  '/:id/report',
  commentRateLimiter,
  validate(commentIdParamSchema, 'params'),
  validate(reportCommentSchema),
  commentController.report,
);

router.patch(
  '/:id/moderate',
  authenticate,
  authorize(Permission.CONTENT_UPDATE),
  validate(commentIdParamSchema, 'params'),
  validate(moderateCommentSchema),
  commentController.moderate,
);

router.delete(
  '/:id',
  authenticate,
  authorize(Permission.CONTENT_DELETE),
  validate(commentIdParamSchema, 'params'),
  commentController.remove,
);

export default router;
