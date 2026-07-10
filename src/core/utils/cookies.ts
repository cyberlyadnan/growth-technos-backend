import { Response } from 'express';
import { env } from '@core/config';
import { parseDurationToMs } from '@core/utils/duration';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none',
  domain: env.COOKIE_DOMAIN !== 'localhost' ? env.COOKIE_DOMAIN : undefined,
  path: '/',
};

export interface AuthCookieOptions {
  rememberMe?: boolean;
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  options: AuthCookieOptions = {},
): void {
  const refreshDuration = options.rememberMe
    ? env.JWT_REFRESH_REMEMBER_EXPIRES_IN
    : env.JWT_REFRESH_EXPIRES_IN;

  res.cookie('accessToken', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: parseDurationToMs(env.JWT_ACCESS_EXPIRES_IN, 15 * 60_000),
  });

  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: parseDurationToMs(refreshDuration),
    path: '/api/v1/auth',
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', { ...COOKIE_OPTIONS, path: '/api/v1/auth' });
}
