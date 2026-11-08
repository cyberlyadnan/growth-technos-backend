import { Router } from 'express';
import { salesWorkflowController } from '../controller/sales-workflow.controller';
import { Permission } from '@core/constants';
import { authorize } from '@core/middlewares';

const router = Router();

router.post('/outreach', authorize(Permission.CLIENTS_UPDATE), (req, res, next) => salesWorkflowController.recordOutreach(req, res, next));
router.post('/response', authorize(Permission.CLIENTS_UPDATE), (req, res, next) => salesWorkflowController.recordResponse(req, res, next));
router.post('/discovery-notes', authorize(Permission.CLIENTS_UPDATE), (req, res, next) => salesWorkflowController.saveDiscoveryNotes(req, res, next));
router.get('/follow-ups', authorize(Permission.CLIENTS_READ), (req, res, next) => salesWorkflowController.listFollowUps(req, res, next));
router.post('/follow-ups/:clientId/complete', authorize(Permission.CLIENTS_UPDATE), (req, res, next) => salesWorkflowController.completeFollowUp(req, res, next));
router.get('/analytics', authorize(Permission.CLIENTS_READ), (req, res, next) => salesWorkflowController.getSalesAnalytics(req, res, next));

export default router;
