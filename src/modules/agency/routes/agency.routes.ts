import { Router } from 'express';
import { Permission } from '@core/constants';
import { authenticate, authorize } from '@core/middlewares';
import { agencyController } from '../controller/agency.controller';
import clientRoutes from '../clients/routes/client.routes';
import projectRoutes from '../projects/routes/project.routes';

const router = Router();

router.use(authenticate);

router.get('/foundation', authorize(Permission.AGENCY_READ), agencyController.getFoundation);
router.use('/clients', clientRoutes);
router.use('/projects', projectRoutes);

export default router;
