import { UserRole } from '@core/constants';

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  permissions: string[];
  avatar?: string;
  emailVerified: boolean;
}

export interface LoginResponse {
  user: AuthUserResponse;
  tokens: AuthTokensResponse;
}

export interface SessionContext {
  ip?: string;
  userAgent?: string;
}
