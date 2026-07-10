import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize, validate } from '@core/middlewares';
import { authorController } from '../controller/author.controller';
import {
  authorIdParamSchema,
  createAuthorSchema,
  listAuthorSchema,
  updateAuthorSchema,
} from '../validation/author.validation';

const router = Router();

router.use(authenticate);

router.get('/', authorize(Permission.CONTENT_READ), validate(listAuthorSchema, 'query'), authorController.list);
router.post('/', authorize(Permission.CONTENT_CREATE), validate(createAuthorSchema), authorController.create);
router.get('/:id', authorize(Permission.CONTENT_READ), validate(authorIdParamSchema, 'params'), authorController.getById);
router.patch(
  '/:id',
  authorize(Permission.CONTENT_UPDATE),
  validate(authorIdParamSchema, 'params'),
  validate(updateAuthorSchema),
  authorController.update,
);
router.delete('/:id', authorize(Permission.CONTENT_DELETE), validate(authorIdParamSchema, 'params'), authorController.remove);
router.post('/:id/restore', authorize(Permission.CONTENT_UPDATE), validate(authorIdParamSchema, 'params'), authorController.restore);
router.delete(
  '/:id/permanent',
  authorize(Permission.CONTENT_DELETE),
  validate(authorIdParamSchema, 'params'),
  authorController.permanentDelete,
);

export default router;
