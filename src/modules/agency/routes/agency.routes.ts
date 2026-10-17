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
import assetRoutes from '../assets/routes/asset.routes';
import maintenanceRoutes from '../maintenance/routes/maintenance.routes';
import documentRoutes from '../documents/routes/document.routes';
import activityRoutes from '../activity/routes/activity.routes';
import handoverRoutes from '../handover/routes/handover.routes';

const router = Router();

router.use(authenticate);

router.get('/foundation', authorize(Permission.AGENCY_READ), agencyController.getFoundation);
router.use('/clients', clientRoutes);
router.use('/projects', projectRoutes);
router.use('/quotations', quotationRoutes);
router.use(billingRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reports', reportsRoutes);
router.use('/assets', assetRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/documents', documentRoutes);
router.use('/activity', activityRoutes);
router.use('/handovers', handoverRoutes);

export default router;
