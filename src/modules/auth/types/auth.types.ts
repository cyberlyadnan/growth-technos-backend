import { UserRole, UserStatus } from '@core/constants';

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  permissions: string[];
  status: UserStatus;
  avatar?: string;
  phone?: string;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  user: AuthUserResponse;
  tokens: AuthTokensResponse;
}

export interface SessionContext {
  ip?: string;
  userAgent?: string;
  rememberMe?: boolean;
}

export interface SessionValidationResponse {
  authenticated: true;
  user: AuthUserResponse;
  session: {
    accessTokenExpiresAt: string | null;
  };
}

export interface ForgotPasswordResponse {
  message: string;
  /** Included in development when SMTP is not configured */
  resetUrl?: string;
}
