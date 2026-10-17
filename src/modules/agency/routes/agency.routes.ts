import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize } from '@core/middlewares';
import { agencyController } from '../controller/agency.controller';
import clientRoutes from '../clients/routes/client.routes';
import projectRoutes from '../projects/routes/project.routes';
import quotationRoutes from '../quotations/routes/quotation.routes';
import billingRoutes from '../billing/routes/billing.routes';
import expenseRoutes from '../expenses/routes/expense.routes';
import reportsRoutes from '../reports/routes/reports.routes';

const router = Router();

router.use(authenticate);

router.get('/foundation', authorize(Permission.AGENCY_READ), agencyController.getFoundation);
router.use('/clients', clientRoutes);
router.use('/projects', projectRoutes);
router.use('/quotations', quotationRoutes);
router.use(billingRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reports', reportsRoutes);

export default router;
