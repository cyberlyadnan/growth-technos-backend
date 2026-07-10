import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@core/config';
import { ADMIN_ROLES } from '@core/constants';
import { AuthenticationError, AuthorizationError } from '@core/errors';
import { JwtPayload } from '@core/types';
import { loggers } from '@core/logger';

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken as string;
  }
  return null;
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AuthenticationError('Access token required');
    }

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    if (decoded.type !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
    };

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
      return;
    }
    loggers.auth.warn('Authentication failed', { error: (error as Error).message });
    next(new AuthenticationError('Invalid or expired access token'));
  }
};

export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req);
    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    if (decoded.type === 'access') {
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions,
      };
    }
    next();
  } catch {
    next();
  }
};

export const authorize =
  (...requiredPermissions: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError());
      return;
    }

    const hasPermission = requiredPermissions.every((perm) =>
      req.user!.permissions.includes(perm),
    );

    if (!hasPermission) {
      loggers.security.warn('Authorization denied', {
        userId: req.user.id,
        required: requiredPermissions,
        actual: req.user.permissions,
      });
      next(new AuthorizationError());
      return;
    }

    next();
  };

export const authorizeRoles =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError());
      return;
    }

    if (!roles.includes(req.user.role)) {
      loggers.security.warn('Role authorization denied', {
        userId: req.user.id,
        required: roles,
        actual: req.user.role,
      });
      next(new AuthorizationError());
      return;
    }

    next();
  };

/** Restricts access to authenticated admin users (extensible for future roles). */
export const requireAdmin = authorizeRoles(...ADMIN_ROLES);

/**
 * Guest-only routes (login, forgot password).
 * Allows access when unauthenticated or when the access token is invalid/expired.
 */
export const guestOnly = (req: Request, _res: Response, next: NextFunction): void => {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    if (decoded.type === 'access') {
      next(new AuthorizationError('You are already signed in'));
      return;
    }
  } catch {
    // Expired or invalid token — allow guest route access
  }

  next();
};

export { extractToken };
