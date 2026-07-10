import { RequestHandler } from 'express';
import { loggers } from '@core/logger';

const PROHIBITED_KEY_REGEX = /^\$|\./g;

interface SanitizeOptions {
  replaceWith?: string;
  allowDots?: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProhibitedKey(key: string, allowDots: boolean): boolean {
  return allowDots ? /^\$/.test(key) : /^\$|\./.test(key);
}

function isSafeReplacementKey(key: string): boolean {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

/**
 * Mutates target in-place — required for Express 5 where req.query is getter-only.
 */
function sanitizeInPlace(
  target: Record<string, unknown>,
  options: SanitizeOptions,
): boolean {
  let isSanitized = false;
  const allowDots = options.allowDots ?? false;
  const replaceWith = options.replaceWith;

  const walk = (obj: Record<string, unknown>): void => {
    for (const key of Object.keys(obj)) {
      const value = obj[key];

      if (isProhibitedKey(key, allowDots)) {
        isSanitized = true;
        delete obj[key];

        if (replaceWith && isSafeReplacementKey(key)) {
          const sanitizedKey = key.replace(PROHIBITED_KEY_REGEX, replaceWith);
          if (isSafeReplacementKey(sanitizedKey)) {
            obj[sanitizedKey] = value;
          }
        }
        continue;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (isPlainObject(item)) walk(item);
        });
      } else if (isPlainObject(value)) {
        walk(value);
      }
    }
  };

  walk(target);
  return isSanitized;
}

/**
 * Express 5 compatible MongoDB query sanitization.
 * Avoids reassigning req.query / req.params (getter-only in Express 5).
 */
export function mongoSanitizeMiddleware(options: SanitizeOptions = {}): RequestHandler {
  const replaceWith = options.replaceWith ?? '_';

  return (req, _res, next) => {
    const sources: Array<'body' | 'params' | 'query'> = ['body', 'params', 'query'];

    for (const source of sources) {
      const data = req[source];
      if (!data || typeof data !== 'object') continue;

      const wasSanitized = sanitizeInPlace(data as Record<string, unknown>, {
        replaceWith,
        allowDots: false,
      });

      if (wasSanitized) {
        loggers.security.warn('Sanitized prohibited MongoDB operator in request', {
          source,
          url: req.originalUrl,
        });
      }
    }

    next();
  };
}
