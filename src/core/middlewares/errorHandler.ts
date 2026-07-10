import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppError, ErrorCode } from '@core/errors';
import { sendError } from '@core/response';
import { logger, loggers } from '@core/logger';
import { isProduction } from '@core/config';

export const errorHandler: ErrorRequestHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error(error.message, { stack: error.stack, code: error.code });
    }
    sendError(res, error.message, error.statusCode, error.errors);
    return;
  }

  if (error instanceof ZodError) {
    const errors = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    sendError(res, 'Validation failed', 422, errors);
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message,
    }));
    sendError(res, 'Validation failed', 422, errors);
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    sendError(res, 'Invalid resource identifier', 400);
    return;
  }

  if ((error as { code?: number }).code === 11000) {
    const keyPattern = (error as { keyPattern?: Record<string, number> }).keyPattern;
    const field = keyPattern ? Object.keys(keyPattern)[0] : 'field';
    sendError(res, `Duplicate value for ${field}`, 409);
    return;
  }

  if (error instanceof TokenExpiredError) {
    loggers.auth.warn('Token expired', { error: error.message });
    sendError(res, 'Token has expired', 401, [], { code: ErrorCode.TOKEN_EXPIRED });
    return;
  }

  if (error instanceof JsonWebTokenError) {
    loggers.security.warn('Invalid token', { error: error.message });
    sendError(res, 'Invalid token', 401, [], { code: ErrorCode.TOKEN_INVALID });
    return;
  }

  logger.error('Unhandled error', { message: error.message, stack: error.stack });
  sendError(
    res,
    isProduction ? 'Internal server error' : error.message,
    500,
    [],
    isProduction ? null : { stack: error.stack },
  );
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
};
