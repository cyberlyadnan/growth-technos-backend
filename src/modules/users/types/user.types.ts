import { UserRole, UserStatus } from '@core/constants';

export interface AdminUserResponse {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListAdminUsersQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  status?: UserStatus;
}

export interface CreateAdminUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  status?: UserStatus;
}

export interface UpdateAdminUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status?: UserStatus;
}

export interface ResetAdminPasswordDto {
  password: string;
}
