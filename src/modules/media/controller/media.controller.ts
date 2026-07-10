import { Request, Response } from 'express';
import { BadRequestError } from '@core/errors';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { mediaService } from '../service/media.service';
import { UploadMediaOptions } from '../types/media.types';

function parseUploadOptions(req: Request): UploadMediaOptions {
  return {
    alt: typeof req.body.alt === 'string' ? req.body.alt : undefined,
    caption: typeof req.body.caption === 'string' ? req.body.caption : undefined,
    blog: typeof req.body.blog === 'string' ? req.body.blog : undefined,
    folder: typeof req.body.folder === 'string' ? req.body.folder : undefined,
  };
}

export class MediaController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await mediaService.list(req.query);
    sendPaginated(res, result.media, result.meta);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const media = await mediaService.getById(String(req.params.id));
    sendSuccess(res, media);
  });

  upload = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new BadRequestError('No file uploaded. Use the "file" field.');
    }

    const media = await mediaService.upload(req.file, parseUploadOptions(req), req.user!.id);
    sendCreated(res, media, 'Image uploaded successfully');
  });

  uploadBulk = asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files?.length) {
      throw new BadRequestError('No files uploaded. Use the "files" field.');
    }

    const media = await mediaService.uploadMany(files, parseUploadOptions(req), req.user!.id);
    sendCreated(res, media, 'Images uploaded successfully');
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const media = await mediaService.update(String(req.params.id), req.body);
    sendSuccess(res, media, 'Media updated successfully');
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await mediaService.softDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });

  restore = asyncHandler(async (req: Request, res: Response) => {
    const media = await mediaService.restore(String(req.params.id), req.user!.id);
    sendSuccess(res, media, 'Media restored successfully');
  });

  permanentDelete = asyncHandler(async (req: Request, res: Response) => {
    await mediaService.permanentDelete(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });
}

export const mediaController = new MediaController();
