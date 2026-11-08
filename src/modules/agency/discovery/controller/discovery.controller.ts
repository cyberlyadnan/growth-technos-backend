import { Request, Response, NextFunction } from 'express';
import { discoveryService } from '../service/discovery.service';
import { sendSuccess, sendCreated } from '@core/response';

export class DiscoveryController {
  async startJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const job = await discoveryService.startJob(req.body, user?.id || user?._id, user?.name);
      sendSuccess(res, job, 'Discovery job started successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async listJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 15;
      const jobs = await discoveryService.listJobs(limit);
      sendSuccess(res, jobs, 'Discovery jobs retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = await discoveryService.getJobStatus(jobId);
      sendSuccess(res, job, 'Job status retrieved');
    } catch (error) {
      next(error);
    }
  }

  async cancelJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = await discoveryService.cancelJob(jobId);
      sendSuccess(res, job, 'Discovery job cancelled');
    } catch (error) {
      next(error);
    }
  }

  async listProspects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId, grade, reviewStatus, isDuplicate, search, page, limit } = req.query;
      const result = await discoveryService.listStagedProspects({
        jobId: jobId ? String(jobId) : undefined,
        grade: grade ? String(grade) : undefined,
        reviewStatus: reviewStatus ? String(reviewStatus) : undefined,
        isDuplicate: isDuplicate !== undefined ? isDuplicate === 'true' : undefined,
        search: search ? String(search) : undefined,
        page: page ? parseInt(String(page), 10) : 1,
        limit: limit ? parseInt(String(limit), 10) : 20,
      });
      sendSuccess(res, result.items, 'Staged prospects retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getProspect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const prospect = await discoveryService.getStagedProspect(id);
      sendSuccess(res, prospect, 'Prospect dossier retrieved');
    } catch (error) {
      next(error);
    }
  }

  async approveProspect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const result = await discoveryService.approveProspect(
        id,
        user?.id || user?._id,
        user?.role,
        req.body,
      );
      sendSuccess(res, result, 'Prospect approved into CRM successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async rejectProspect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const result = await discoveryService.rejectProspect(
        id,
        req.body?.reason || 'Not suitable',
        user?.id || user?._id,
      );
      sendSuccess(res, result, 'Prospect rejected', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const discoveryController = new DiscoveryController();
