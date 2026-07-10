import { Request, Response } from 'express';
import { asyncHandler, sendCreated, sendNoContent, sendPaginated, sendSuccess } from '@core/response';
import { userService } from '../service/user.service';

export class UserController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await userService.listAdmins(req.query);
    sendPaginated(res, result.users, result.meta);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getAdminById(String(req.params.id));
    sendSuccess(res, user);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.createAdmin(req.body, req.user!.id);
    sendCreated(res, user, 'Admin user created successfully');
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateAdmin(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, user, 'Admin user updated successfully');
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    await userService.resetAdminPassword(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, null, 'Password reset successfully');
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await userService.deleteAdmin(String(req.params.id), req.user!.id);
    sendNoContent(res);
  });
}

export const userController = new UserController();
