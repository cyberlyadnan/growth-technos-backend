import { Router } from 'express';
import { Permission } from '@core/constants';
import { authorize, validate } from '@core/middlewares';
import { expenseController } from '../controller/expense.controller';
import {
  addExpenseNoteSchema,
  createExpenseSchema,
  expenseIdParamSchema,
  listExpensesSchema,
  updateExpenseSchema,
  voidExpenseSchema,
} from '../validation/expense.validation';

const router = Router();

router.get(
  '/',
  authorize(Permission.EXPENSES_READ),
  validate(listExpensesSchema, 'query'),
  expenseController.list,
);
router.post(
  '/',
  authorize(Permission.EXPENSES_CREATE),
  validate(createExpenseSchema),
  expenseController.create,
);
router.get(
  '/:id',
  authorize(Permission.EXPENSES_READ),
  validate(expenseIdParamSchema, 'params'),
  expenseController.getById,
);
router.patch(
  '/:id',
  authorize(Permission.EXPENSES_UPDATE),
  validate(expenseIdParamSchema, 'params'),
  validate(updateExpenseSchema),
  expenseController.update,
);
router.post(
  '/:id/record',
  authorize(Permission.EXPENSES_UPDATE),
  validate(expenseIdParamSchema, 'params'),
  expenseController.record,
);
router.post(
  '/:id/finalize',
  authorize(Permission.EXPENSES_UPDATE),
  validate(expenseIdParamSchema, 'params'),
  expenseController.finalize,
);
router.post(
  '/:id/void',
  authorize(Permission.EXPENSES_UPDATE),
  validate(expenseIdParamSchema, 'params'),
  validate(voidExpenseSchema),
  expenseController.void,
);
router.post(
  '/:id/notes',
  authorize(Permission.EXPENSES_UPDATE),
  validate(expenseIdParamSchema, 'params'),
  validate(addExpenseNoteSchema),
  expenseController.addNote,
);
router.post(
  '/:id/restore',
  authorize(Permission.EXPENSES_UPDATE),
  validate(expenseIdParamSchema, 'params'),
  expenseController.restore,
);
router.delete(
  '/:id',
  authorize(Permission.EXPENSES_DELETE),
  validate(expenseIdParamSchema, 'params'),
  expenseController.remove,
);

export default router;
