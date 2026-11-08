import { Request, Response, NextFunction } from 'express';
import { salesWorkflowService } from '../service/sales-workflow.service';
import { sendSuccess, sendCreated } from '@core/response';

export class SalesWorkflowController {
  async recordOutreach(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const client = await salesWorkflowService.recordOutreachActivity(
        req.body,
        user?.id || user?._id,
        user?.name,
      );
      sendSuccess(res, client, 'Outreach activity recorded successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async recordResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const client = await salesWorkflowService.recordClientResponse(
        req.body,
        user?.id || user?._id,
        user?.name,
      );
      sendSuccess(res, client, 'Prospect response recorded successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async saveDiscoveryNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const client = await salesWorkflowService.saveDiscoveryCallNotes(
        req.body,
        user?.id || user?._id,
        user?.name,
      );
      sendSuccess(res, client, 'Discovery call notes saved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async listFollowUps(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await salesWorkflowService.listFollowUps();
      sendSuccess(res, result, 'Follow-up reminders retrieved');
    } catch (error) {
      next(error);
    }
  }

  async completeFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.params;
      const user = (req as any).user;
      const { action, notes, rescheduleDate } = req.body;
      const client = await salesWorkflowService.completeFollowUp(
        clientId,
        action || 'completed',
        { notes: notes || '', rescheduleDate },
        user?.id || user?._id,
        user?.name,
      );
      sendSuccess(res, client, 'Follow-up status updated');
    } catch (error) {
      next(error);
    }
  }

  async getSalesAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const timeframe = String(req.query.timeframe || '30d');
      const analytics = await salesWorkflowService.getSalesAnalytics(timeframe);
      sendSuccess(res, analytics, 'Sales analytics retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const salesWorkflowController = new SalesWorkflowController();
