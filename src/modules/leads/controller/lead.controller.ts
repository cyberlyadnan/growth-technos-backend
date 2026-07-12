import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { DeviceType } from '@core/constants/leads';
import { leadFormService } from '../service/lead-form.service';
import { leadService } from '../service/lead.service';

function parseClientMeta(req: Request) {
  const ua = req.get('user-agent') ?? undefined;
  const forwarded = req.get('x-forwarded-for');
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
    req.ip ||
    undefined;

  let device: string = DeviceType.DESKTOP;
  if (ua) {
    const lower = ua.toLowerCase();
    if (/mobile|android|iphone|ipod/.test(lower)) device = DeviceType.MOBILE;
    else if (/ipad|tablet/.test(lower)) device = DeviceType.TABLET;
  }

  return {
    ip,
    userAgent: ua,
    browser: ua?.split(' ')[0],
    device,
    location: null,
  };
}

export class LeadController {
  listForms = asyncHandler(async (req: Request, res: Response) => {
    const result = await leadFormService.list(req.query);
    sendPaginated(res, result.forms, result.meta);
  });

  getFormById = asyncHandler(async (req: Request, res: Response) => {
    const form = await leadFormService.getById(String(req.params.id));
    sendSuccess(res, form);
  });

  getPublicFormBySlug = asyncHandler(async (req: Request, res: Response) => {
    const form = await leadFormService.getPublishedBySlug(String(req.params.slug));
    sendSuccess(res, form);
  });

  createForm = asyncHandler(async (req: Request, res: Response) => {
    const form = await leadFormService.create(req.body, req.user!.id);
    sendCreated(res, form, 'Lead form created successfully');
  });

  updateForm = asyncHandler(async (req: Request, res: Response) => {
    const form = await leadFormService.update(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, form, 'Lead form updated successfully');
  });

  deleteForm = asyncHandler(async (req: Request, res: Response) => {
    await leadFormService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  restoreForm = asyncHandler(async (req: Request, res: Response) => {
    const form = await leadFormService.restore(String(req.params.id), req.user!.id);
    sendSuccess(res, form, 'Lead form restored successfully');
  });

  publishForm = asyncHandler(async (req: Request, res: Response) => {
    const form = await leadFormService.publish(String(req.params.id), req.user!.id);
    sendSuccess(res, form, 'Lead form published successfully');
  });

  unpublishForm = asyncHandler(async (req: Request, res: Response) => {
    const form = await leadFormService.unpublish(String(req.params.id), req.user!.id);
    sendSuccess(res, form, 'Lead form unpublished successfully');
  });

  submitLead = asyncHandler(async (req: Request, res: Response) => {
    const result = await leadService.submit(req.body, parseClientMeta(req));
    sendCreated(res, result, 'Lead submitted successfully');
  });

  listLeads = asyncHandler(async (req: Request, res: Response) => {
    const result = await leadService.list(req.query);
    sendPaginated(res, result.leads, result.meta);
  });

  getLeadById = asyncHandler(async (req: Request, res: Response) => {
    const lead = await leadService.getById(String(req.params.id));
    sendSuccess(res, lead);
  });

  updateLead = asyncHandler(async (req: Request, res: Response) => {
    const lead = await leadService.update(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, lead, 'Lead updated successfully');
  });

  deleteLead = asyncHandler(async (req: Request, res: Response) => {
    await leadService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });
}

export const leadController = new LeadController();
