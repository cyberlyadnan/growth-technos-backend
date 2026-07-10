import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { asyncHandler, sendSuccess, sendCreated } from '@core/response';
import { setAuthCookies, clearAuthCookies } from '@core/utils/cookies';
import { extractClientMetadata } from '@core/utils/clientMetadata';
import { extractToken } from '@core/middlewares/authenticate';
import { env } from '@core/config';
import { JwtPayload } from '@core/types';
import { authService } from '../service/auth.service';

export class AuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body, req.user?.id);
    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    sendCreated(res, result, 'Admin account created successfully');
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const session = extractClientMetadata(req);
    const rememberMe = Boolean(req.body.rememberMe);
    const result = await authService.login(req.body, {
      ip: session.ip,
      userAgent: session.userAgent,
      rememberMe,
    });
    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken, { rememberMe });
    sendSuccess(res, result, 'Login successful');
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken =
      req.body.refreshToken || (req.cookies?.refreshToken as string | undefined);

    const session = extractClientMetadata(req);
    const result = await authService.refresh(refreshToken!, {
      ip: session.ip,
      userAgent: session.userAgent,
    });
    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    sendSuccess(res, result, 'Token refreshed');
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    await authService.logout(refreshToken);
    clearAuthCookies(res);
    sendSuccess(res, null, 'Logged out successfully');
  });

  logoutAll = asyncHandler(async (req: Request, res: Response) => {
    await authService.logoutAll(req.user!.id);
    clearAuthCookies(res);
    sendSuccess(res, null, 'All sessions revoked');
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getMe(req.user!.id);
    sendSuccess(res, user);
  });

  session = asyncHandler(async (req: Request, res: Response) => {
    const token = extractToken(req);
    let expiresAt: number | undefined;

    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
        expiresAt = decoded.exp;
      } catch {
        expiresAt = undefined;
      }
    }

    const result = await authService.validateSession(req.user!.id, expiresAt);
    sendSuccess(res, result);
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.changePassword(req.user!.id, req.body);
    clearAuthCookies(res);
    sendSuccess(res, null, 'Password changed — please login again');
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.forgotPassword(req.body);
    sendSuccess(res, result, result.message);
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);
    sendSuccess(res, null, 'Password reset successful — please login with your new password');
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.updateProfile(req.user!.id, req.body);
    sendSuccess(res, user, 'Profile updated successfully');
  });

  updateAvatar = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.updateAvatar(req.user!.id, req.body);
    sendSuccess(res, user, 'Profile image updated successfully');
  });
}

export const authController = new AuthController();
