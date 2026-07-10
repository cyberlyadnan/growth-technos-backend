import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '@core/errors';

type RequestSource = 'body' | 'query' | 'params';

function assignValidatedData(req: Request, source: RequestSource, data: unknown): void {
  if (source === 'body') {
    req.body = data;
    return;
  }

  const target = req[source] as Record<string, unknown>;
  const validated = data as Record<string, unknown>;

  for (const key of Object.keys(target)) {
    if (!(key in validated)) {
      delete target[key];
    }
  }

  Object.assign(target, validated);
}

export const validate =
  (schema: ZodSchema, source: RequestSource = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      throw new ValidationError('Validation failed', errors);
    }

    assignValidatedData(req, source, result.data);
    next();
  };
