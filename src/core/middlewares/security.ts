import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import compression from 'compression';
import { env } from '@core/config';
import { mongoSanitizeMiddleware } from './mongoSanitize';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

function getAllowedCorsOrigins(): string[] {
  const configured = [
    env.CLIENT_URL,
    ...(env.CORS_ORIGINS?.split(',') ?? []),
  ]
    .map((val) => val.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const origins = new Set<string>();

  for (const origin of configured) {
    origins.add(origin);

    // Automatically pair www and non-www variants to prevent common CORS dropouts
    try {
      const url = new URL(origin);
      if (url.hostname.startsWith('www.')) {
        origins.add(`${url.protocol}//${url.hostname.replace(/^www\./, '')}${url.port ? `:${url.port}` : ''}`);
      } else if (!url.hostname.includes('localhost') && !url.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        origins.add(`${url.protocol}//www.${url.hostname}${url.port ? `:${url.port}` : ''}`);
      }
    } catch {
      // Ignore invalid URL strings in env
    }
  }

  return [...origins];
}

const allowedCorsOrigins = getAllowedCorsOrigins();

const GROWTH_TECHNOS_DOMAIN_REGEX = /^https?:\/\/(?:[a-zA-Z0-9-]+\.)?growth-?technos\.com$/;
const VERCEL_PREVIEW_REGEX = /^https:\/\/(?:[a-zA-Z0-9-]+-)?growth-?technos(?:-[a-zA-Z0-9-]+)?\.vercel\.app$/;

export const corsMiddleware = cors({
  origin(origin, callback) {
    // Non-browser clients (server-side fetch, curl, health probes) send no Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = origin.trim().replace(/\/+$/, '');

    // 1. Direct match with configured origins (CLIENT_URL, CORS_ORIGINS, paired www/apex)
    if (allowedCorsOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    // 2. Allow any growthtechnos.com domain or subdomain
    if (GROWTH_TECHNOS_DOMAIN_REGEX.test(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    // 3. Allow Vercel preview deployments for this project
    if (VERCEL_PREVIEW_REGEX.test(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-Id',
    'Accept',
    'Cache-Control',
    'X-Requested-With',
  ],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400,
});

export const rateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    data: null,
    errors: [],
    meta: null,
  },
});

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  // Successful logins should not consume the attempt budget.
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    data: null,
    errors: [],
    meta: null,
  },
});

export const commentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many comment actions, please try again later',
    data: null,
    errors: [],
    meta: null,
  },
});

/** Tight limit for credential reveal / rewrap / secret update. */
export const vaultSensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many vault sensitive actions, please try again later',
    data: null,
    errors: [],
    meta: null,
  },
});

export const sanitizeMiddleware = mongoSanitizeMiddleware({ replaceWith: '_' });

export const hppMiddleware = hpp();
export const compressionMiddleware = compression();
