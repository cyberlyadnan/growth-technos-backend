import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '@core/types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta: PaginationMeta | Record<string, unknown> | null = null,
): Response<ApiResponse<T>> {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    errors: [],
    meta,
  });
}

export function sendCreated<T>(
  res: Response,
  data: T,
  message = 'Resource created successfully',
): Response<ApiResponse<T>> {
  return sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message = 'Success',
): Response<ApiResponse<T[]>> {
  return sendSuccess(res, data, message, 200, meta);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors: Array<{ field?: string; message: string; code?: string }> = [],
  meta: Record<string, unknown> | null = null,
): Response<ApiResponse<null>> {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors,
    meta,
  });
}
