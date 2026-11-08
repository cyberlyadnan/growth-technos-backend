import { Router } from 'express';
import { opportunityController } from '../controller/opportunity.controller';
import { Permission } from '@core/constants';
import { authorize } from '@core/middlewares';

const router = Router();

router.post('/', authorize(Permission.CLIENTS_CREATE), (req, res, next) => opportunityController.createOpportunity(req, res, next));
router.get('/', authorize(Permission.CLIENTS_READ), (req, res, next) => opportunityController.listOpportunities(req, res, next));
router.get('/:id', authorize(Permission.CLIENTS_READ), (req, res, next) => opportunityController.getOpportunity(req, res, next));
router.patch('/:id', authorize(Permission.CLIENTS_UPDATE), (req, res, next) => opportunityController.updateOpportunity(req, res, next));
router.delete('/:id', authorize(Permission.CLIENTS_DELETE), (req, res, next) => opportunityController.deleteOpportunity(req, res, next));

export default router;
