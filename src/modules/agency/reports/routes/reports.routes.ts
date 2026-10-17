import { Router } from 'express';
import { Permission } from '@core/constants';
import { authorize, validate } from '@core/middlewares';
import { reportsController } from '../controller/reports.controller';
import { reportFiltersSchema } from '../validation/reports.validation';

const router = Router();

router.get('/', authorize(Permission.REPORTS_READ), reportsController.catalog);

router.get(
  '/summary',
  authorize(Permission.REPORTS_READ),
  validate(reportFiltersSchema, 'query'),
  reportsController.summary,
);
router.get(
  '/overdue-invoices',
  authorize(Permission.REPORTS_READ),
  validate(reportFiltersSchema, 'query'),
  reportsController.overdue,
);
router.get(
  '/expenses',
  authorize(Permission.REPORTS_READ),
  validate(reportFiltersSchema, 'query'),
  reportsController.expenses,
);
router.get(
  '/refunds-adjustments',
  authorize(Permission.REPORTS_READ),
  validate(reportFiltersSchema, 'query'),
  reportsController.refunds,
);
router.get(
  '/project-profitability',
  authorize(Permission.REPORTS_READ),
  validate(reportFiltersSchema, 'query'),
  reportsController.projectProfitability,
);
router.get(
  '/client-balances',
  authorize(Permission.REPORTS_READ),
  validate(reportFiltersSchema, 'query'),
  reportsController.clientBalances,
);
router.get(
  '/recurring',
  authorize(Permission.REPORTS_READ),
  validate(reportFiltersSchema, 'query'),
  reportsController.recurring,
);

export default router;
