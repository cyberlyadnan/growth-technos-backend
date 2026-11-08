import { Router } from 'express';
import { discoveryController } from '../controller/discovery.controller';
import { Permission } from '@core/constants';
import { authorize } from '@core/middlewares';

const router = Router();

router.post('/jobs', authorize(Permission.CLIENTS_CREATE), (req, res, next) => discoveryController.startJob(req, res, next));
router.get('/jobs', authorize(Permission.CLIENTS_READ), (req, res, next) => discoveryController.listJobs(req, res, next));
router.get('/jobs/:jobId', authorize(Permission.CLIENTS_READ), (req, res, next) => discoveryController.getJobStatus(req, res, next));
router.post('/jobs/:jobId/cancel', authorize(Permission.CLIENTS_UPDATE), (req, res, next) => discoveryController.cancelJob(req, res, next));

router.get('/prospects', authorize(Permission.CLIENTS_READ), (req, res, next) => discoveryController.listProspects(req, res, next));
router.get('/prospects/:id', authorize(Permission.CLIENTS_READ), (req, res, next) => discoveryController.getProspect(req, res, next));
router.post('/prospects/:id/approve', authorize(Permission.CLIENTS_CREATE), (req, res, next) => discoveryController.approveProspect(req, res, next));
router.post('/prospects/:id/reject', authorize(Permission.CLIENTS_UPDATE), (req, res, next) => discoveryController.rejectProspect(req, res, next));

export default router;
