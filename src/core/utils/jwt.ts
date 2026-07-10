import jwt from 'jsonwebtoken';
import { env } from '@core/config';
import { JwtPayload, TokenPair } from '@core/types';

export function generateAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function generateRefreshToken(
  payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>,
  expiresIn?: string,
): string {
  return jwt.sign({ ...payload, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: (expiresIn ?? env.JWT_REFRESH_EXPIRES_IN) as jwt.SignOptions['expiresIn'],
  });
}

export function generateTokenPair(
  payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>,
  options?: { refreshExpiresIn?: string },
): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload, options?.refreshExpiresIn),
  };
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}
