import {
  ASSIGNABLE_STAFF_ROLES,
  ADMIN_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  resolveRolePermissions,
  UserRole,
  UserStatus,
} from '@core/constants';
import {
  AuthorizationError,
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

  private async getStaffOrThrow(id: string): Promise<IUser> {
    const user = await userRepository.findAdminById(id);
    if (!user) throw new NotFoundError('Admin user');
    return user;
  }

  private assertAssignableRole(role: UserRole): void {
    if (!ASSIGNABLE_STAFF_ROLES.includes(role)) {
      throw new BadRequestError(
        `Role "${role}" cannot be assigned. Allowed: ${ASSIGNABLE_STAFF_ROLES.join(', ')}`,
      );
    }
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
        role: query.role,
      }),
      userRepository.countAdmins({
        search: query.search,
        status: query.status,
        role: query.role,
      }),
    ]);

    return {
      users: users.map((user) => this.toAdminUser(user)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getAdminById(id: string): Promise<AdminUserResponse> {
    const user = await this.getStaffOrThrow(id);
    return this.toAdminUser(user);
  }

  async createAdmin(dto: CreateAdminUserDto, actorId: string): Promise<AdminUserResponse> {
    const exists = await userRepository.exists({ email: dto.email });
    if (exists) throw new ConflictError('Email already registered');

    const role = (dto.role ?? UserRole.ADMIN) as UserRole;
    this.assertAssignableRole(role);

    const hashedPassword = await hashPassword(dto.password);
    const permissions = resolveRolePermissions(role);

    const user = await userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone || undefined,
      avatar: dto.avatar || undefined,
      role,
      permissions,
      status: dto.status ?? UserStatus.ACTIVE,
      emailVerified: false,
      createdBy: actorId as unknown as IUser['createdBy'],
      updatedBy: actorId as unknown as IUser['updatedBy'],
    });

    loggers.admin.info('Staff user created', { userId: user.id, actorId, role });
    return this.toAdminUser(user);
  }

  async updateAdmin(
    id: string,
    dto: UpdateAdminUserDto,
    actorId: string,
  ): Promise<AdminUserResponse> {
    const user = await this.getStaffOrThrow(id);

    if (dto.email && dto.email !== user.email) {
      const exists = await userRepository.exists({ email: dto.email });
      if (exists) throw new ConflictError('Email already registered');
    }

    if (dto.status === UserStatus.INACTIVE && id === actorId) {
      throw new BadRequestError('You cannot deactivate your own account');
    }

    if (dto.role !== undefined) {
      this.assertAssignableRole(dto.role);
      if (user.role === UserRole.SUPER_ADMIN) {
        throw new AuthorizationError('Cannot change the role of a super admin via this API');
      }
      if (id === actorId && dto.role !== user.role) {
        throw new BadRequestError('You cannot change your own role');
      }
    }

    const willLeaveAdminPool =
      ADMIN_ROLES.includes(user.role) &&
      user.status === UserStatus.ACTIVE &&
      ((dto.status && [UserStatus.INACTIVE, UserStatus.SUSPENDED].includes(dto.status)) ||
        (dto.role !== undefined && !ADMIN_ROLES.includes(dto.role)));

    if (willLeaveAdminPool) {
      await this.ensureNotLastActiveAdmin(id, dto.role ? 'demote' : 'deactivate');
    }

    const nextRole = dto.role ?? user.role;
    const permissions =
      dto.role !== undefined
        ? resolveRolePermissions(dto.role)
        : user.permissions?.length
          ? user.permissions
          : (DEFAULT_ROLE_PERMISSIONS[user.role] ?? []);

    const updated = await userRepository.updateById(id, {
      ...(dto.firstName !== undefined && { firstName: dto.firstName }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.phone !== undefined && { phone: dto.phone || undefined }),
      ...(dto.avatar !== undefined && { avatar: dto.avatar || undefined }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.role !== undefined && { role: dto.role, permissions }),
      updatedBy: actorId as unknown as IUser['updatedBy'],
    });

    if (!updated) throw new NotFoundError('Admin user');

    if (
      (dto.status && dto.status !== UserStatus.ACTIVE) ||
      (dto.role !== undefined && dto.role !== user.role)
    ) {
      await refreshTokenRepository.revokeAllForUser(id);
    }

    loggers.admin.info('Staff user updated', {
      userId: id,
      actorId,
      role: nextRole,
    });
    return this.toAdminUser(updated);
  }

  async resetAdminPassword(
    id: string,
    dto: ResetAdminPasswordDto,
    actorId: string,
  ): Promise<void> {
    await this.getStaffOrThrow(id);

    const hashedPassword = await hashPassword(dto.password);
    await userRepository.updateById(id, {
      password: hashedPassword,
      passwordChangedAt: new Date(),
      updatedBy: actorId as unknown as IUser['updatedBy'],
    });

    await refreshTokenRepository.revokeAllForUser(id);
    loggers.admin.info('Staff password reset by administrator', { userId: id, actorId });
  }

  async deleteAdmin(id: string, actorId: string): Promise<void> {
    if (id === actorId) {
      throw new BadRequestError('You cannot delete your own account while logged in');
    }

    const user = await this.getStaffOrThrow(id);

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new AuthorizationError('Cannot delete a super admin via this API');
    }

    if (ADMIN_ROLES.includes(user.role) && user.status === UserStatus.ACTIVE) {
      await this.ensureNotLastActiveAdmin(id, 'delete');
    }

    await userRepository.softDeleteById(id, actorId);
    await refreshTokenRepository.revokeAllForUser(id);
    loggers.admin.info('Staff user deleted', { userId: id, actorId });
  }
}

export const userService = new UserService();
