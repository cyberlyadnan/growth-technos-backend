import { Request, Response } from 'express';
import { asyncHandler, sendSuccess, sendCreated } from '@core/response';
import { setAuthCookies, clearAuthCookies } from '@core/utils/cookies';
import { extractClientMetadata } from '@core/utils/clientMetadata';
import { Permission } from '@core/constants';
import { authService } from '../service/auth.service';

export class AuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body, req.user?.id);
    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    sendCreated(res, result, 'Registration successful');
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const session = extractClientMetadata(req);
    const result = await authService.login(req.body, {
      ip: session.ip,
      userAgent: session.userAgent,
    });
    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
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

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.changePassword(req.user!.id, req.body);
    clearAuthCookies(res);
    sendSuccess(res, null, 'Password changed — please login again');
  });
}

export const authController = new AuthController();

// Permission constants used by routes
export const AUTH_PERMISSIONS = {
  USERS_CREATE: Permission.USERS_CREATE,
};
