import { Request, Response, NextFunction } from 'express';
import { opportunityService } from '../service/opportunity.service';
import { sendSuccess, sendCreated } from '@core/response';

export class OpportunityController {
  async createOpportunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const opportunity = await opportunityService.createOpportunity(req.body, user?.id || user?._id);
      sendSuccess(res, opportunity, 'Opportunity created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateOpportunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const opportunity = await opportunityService.updateOpportunity(id, req.body, user?.id || user?._id);
      sendSuccess(res, opportunity, 'Opportunity updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getOpportunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const opportunity = await opportunityService.getOpportunity(id);
      sendSuccess(res, opportunity, 'Opportunity retrieved');
    } catch (error) {
      next(error);
    }
  }

  async listOpportunities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId, stage, projectCategory, search, page, limit } = req.query;
      const result = await opportunityService.listOpportunities({
        clientId: clientId ? String(clientId) : undefined,
        stage: stage ? String(stage) : undefined,
        projectCategory: projectCategory ? String(projectCategory) : undefined,
        search: search ? String(search) : undefined,
        page: page ? parseInt(String(page), 10) : 1,
        limit: limit ? parseInt(String(limit), 10) : 20,
      });
      sendSuccess(res, { items: result.items, summary: result.summary }, 'Opportunities retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async deleteOpportunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      await opportunityService.deleteOpportunity(id, user?.id || user?._id);
      sendSuccess(res, null, 'Opportunity deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const opportunityController = new OpportunityController();
