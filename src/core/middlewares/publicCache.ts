import { RequestHandler } from 'express';

const DEFAULT_MAX_AGE_SECONDS = 300;
const DEFAULT_STALE_WHILE_REVALIDATE_SECONDS = 600;

/** Sets CDN-friendly cache headers for read-only public endpoints. */
export function publicCacheMiddleware(
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS,
  staleWhileRevalidateSeconds = DEFAULT_STALE_WHILE_REVALIDATE_SECONDS,
): RequestHandler {
  return (_req, res, next) => {
    res.setHeader(
      'Cache-Control',
      `public, max-age=60, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`,
    );
    next();
  };
}
