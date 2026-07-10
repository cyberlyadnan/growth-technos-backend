import {
  DEFAULT_ROLE_PERMISSIONS,
  UserRole,
  UserStatus,
} from '@core/constants';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '@core/errors';
import { buildPaginationMeta, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import { hashPassword } from '@core/utils/password';
import { loggers } from '@core/logger';
import { refreshTokenRepository } from '@modules/auth/repository/refreshToken.repository';
import { IUser } from '../model/user.model';
import { userRepository } from '../repository/user.repository';
import {
  AdminUserResponse,
  CreateAdminUserDto,
  ListAdminUsersQuery,
  ResetAdminPasswordDto,
  UpdateAdminUserDto,
} from '../types/user.types';

export class UserService {
  private toAdminUser(user: IUser): AdminUserResponse {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private async getAdminOrThrow(id: string): Promise<IUser> {
    const user = await userRepository.findAdminById(id);
    if (!user) throw new NotFoundError('Admin user');
    return user;
  }

  private async ensureNotLastActiveAdmin(targetId: string, action: string): Promise<void> {
    const remaining = await userRepository.countActiveAdmins(targetId);
    if (remaining === 0) {
      throw new BadRequestError(`Cannot ${action} the last active admin account`);
    }
  }

  async listAdmins(
    query: ListAdminUsersQuery,
  ): Promise<{ users: AdminUserResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);

    const [users, total] = await Promise.all([
      userRepository.findAdmins({
        skip,
        limit,
        sort,
        search: query.search,
        status: query.status,
      }),
      userRepository.countAdmins({
        search: query.search,
        status: query.status,
      }),
    ]);

    return {
      users: users.map((user) => this.toAdminUser(user)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getAdminById(id: string): Promise<AdminUserResponse> {
    const user = await this.getAdminOrThrow(id);
    return this.toAdminUser(user);
  }

  async createAdmin(dto: CreateAdminUserDto, actorId: string): Promise<AdminUserResponse> {
    const exists = await userRepository.exists({ email: dto.email });
    if (exists) throw new ConflictError('Email already registered');

    const hashedPassword = await hashPassword(dto.password);
    const role = UserRole.ADMIN;

    const user = await userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone || undefined,
      avatar: dto.avatar || undefined,
      role,
      permissions: DEFAULT_ROLE_PERMISSIONS[role],
      status: dto.status ?? UserStatus.ACTIVE,
      emailVerified: false,
      createdBy: actorId as unknown as IUser['createdBy'],
      updatedBy: actorId as unknown as IUser['updatedBy'],
    });

    loggers.admin.info('Admin user created', { userId: user.id, actorId });
    return this.toAdminUser(user);
  }

  async updateAdmin(
    id: string,
    dto: UpdateAdminUserDto,
    actorId: string,
  ): Promise<AdminUserResponse> {
    const user = await this.getAdminOrThrow(id);

    if (dto.email && dto.email !== user.email) {
      const exists = await userRepository.exists({ email: dto.email });
      if (exists) throw new ConflictError('Email already registered');
    }

    if (dto.status === UserStatus.INACTIVE && id === actorId) {
      throw new BadRequestError('You cannot deactivate your own account');
    }

    if (
      dto.status &&
      [UserStatus.INACTIVE, UserStatus.SUSPENDED].includes(dto.status) &&
      user.status === UserStatus.ACTIVE
    ) {
      await this.ensureNotLastActiveAdmin(id, 'deactivate');
    }

    const updated = await userRepository.updateById(id, {
      ...(dto.firstName !== undefined && { firstName: dto.firstName }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.phone !== undefined && { phone: dto.phone || undefined }),
      ...(dto.avatar !== undefined && { avatar: dto.avatar || undefined }),
      ...(dto.status !== undefined && { status: dto.status }),
      updatedBy: actorId as unknown as IUser['updatedBy'],
    });

    if (!updated) throw new NotFoundError('Admin user');

    if (dto.status && dto.status !== UserStatus.ACTIVE) {
      await refreshTokenRepository.revokeAllForUser(id);
    }

    loggers.admin.info('Admin user updated', { userId: id, actorId });
    return this.toAdminUser(updated);
  }

  async resetAdminPassword(
    id: string,
    dto: ResetAdminPasswordDto,
    actorId: string,
  ): Promise<void> {
    await this.getAdminOrThrow(id);

    const hashedPassword = await hashPassword(dto.password);
    await userRepository.updateById(id, {
      password: hashedPassword,
      passwordChangedAt: new Date(),
      updatedBy: actorId as unknown as IUser['updatedBy'],
    });

    await refreshTokenRepository.revokeAllForUser(id);
    loggers.admin.info('Admin password reset by administrator', { userId: id, actorId });
  }

  async deleteAdmin(id: string, actorId: string): Promise<void> {
    if (id === actorId) {
      throw new BadRequestError('You cannot delete your own account while logged in');
    }

    const user = await this.getAdminOrThrow(id);

    if (user.status === UserStatus.ACTIVE) {
      await this.ensureNotLastActiveAdmin(id, 'delete');
    }

    await userRepository.softDeleteById(id, actorId);
    await refreshTokenRepository.revokeAllForUser(id);
    loggers.admin.info('Admin user deleted', { userId: id, actorId });
  }
}

export const userService = new UserService();
