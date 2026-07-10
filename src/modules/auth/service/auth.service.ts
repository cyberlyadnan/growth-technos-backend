import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_ROLE_PERMISSIONS, UserRole, UserStatus } from '@core/constants';
import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  TokenInvalidError,
} from '@core/errors';
import { env } from '@core/config';
import { generateTokenPair, verifyRefreshToken } from '@core/utils/jwt';
import { hashPassword, comparePassword } from '@core/utils/password';
import { loggers } from '@core/logger';
import { userRepository } from '@modules/users/repository/user.repository';
import { IUser } from '@modules/users/model/user.model';
import { refreshTokenRepository } from '../repository/refreshToken.repository';
import {
  AuthUserResponse,
  LoginResponse,
  SessionContext,
} from '../types/auth.types';
import { ChangePasswordDto, LoginDto, RegisterDto } from '../dto/auth.dto';

export class AuthService {
  private toAuthUser(user: IUser): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      permissions: user.permissions,
      avatar: user.avatar,
      emailVerified: user.emailVerified,
    };
  }

  private resolvePermissions(role: UserRole, explicit?: string[]): string[] {
    if (explicit && explicit.length > 0) return explicit;
    return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
  }

  private async persistRefreshToken(
    userId: string,
    refreshToken: string,
    family: string,
    session: SessionContext,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await refreshTokenRepository.create({
      userId: userId as unknown as IUser['_id'],
      token: refreshToken,
      family,
      expiresAt,
      userAgent: session.userAgent,
      ip: session.ip,
    });
  }

  async register(dto: RegisterDto, createdBy?: string): Promise<LoginResponse> {
    const exists = await userRepository.exists({ email: dto.email });
    if (exists) {
      throw new ConflictError('Email already registered');
    }

    const role = (dto.role as UserRole) ?? UserRole.VIEWER;
    const hashedPassword = await hashPassword(dto.password);

    const user = await userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      role,
      permissions: this.resolvePermissions(role),
      status: UserStatus.ACTIVE,
      emailVerified: false,
      ...(createdBy && { createdBy: createdBy as unknown as IUser['createdBy'] }),
    });

    loggers.auth.info('User registered', { userId: user.id, email: user.email, role });

    return this.issueTokens(user, { ip: undefined, userAgent: undefined });
  }

  async login(dto: LoginDto, session: SessionContext): Promise<LoginResponse> {
    const user = await userRepository.findByEmail(dto.email, true);

    if (!user) {
      loggers.security.warn('Login failed — user not found', { email: dto.email, ip: session.ip });
      throw new AuthenticationError('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      loggers.security.warn('Login failed — inactive account', { userId: user.id });
      throw new AuthorizationError('Account is not active');
    }

    const isValid = await comparePassword(dto.password, user.password);
    if (!isValid) {
      loggers.security.warn('Login failed — invalid password', { userId: user.id, ip: session.ip });
      throw new AuthenticationError('Invalid email or password');
    }

    await userRepository.updateById(user.id, { lastLoginAt: new Date() });
    loggers.auth.info('User logged in', { userId: user.id, ip: session.ip });

    return this.issueTokens(user, session);
  }

  async refresh(refreshToken: string, session: SessionContext): Promise<LoginResponse> {
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new TokenInvalidError('Invalid refresh token');
    }

    if (decoded.type !== 'refresh') {
      throw new TokenInvalidError('Invalid token type');
    }

    const storedToken = await refreshTokenRepository.findByToken(refreshToken);
    if (!storedToken) {
      await refreshTokenRepository.revokeFamily(decoded.sub);
      loggers.security.warn('Refresh token reuse detected — family revoked', { userId: decoded.sub });
      throw new TokenInvalidError('Refresh token has been revoked');
    }

    const user = await userRepository.findById(decoded.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AuthenticationError('User account is not available');
    }

    await refreshTokenRepository.revokeToken(refreshToken);

    const permissions = this.resolvePermissions(user.role, user.permissions);
    const tokens = generateTokenPair({
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions,
    });

    await this.persistRefreshToken(user.id, tokens.refreshToken, storedToken.family, session);

    loggers.auth.info('Token refreshed', { userId: user.id });

    return {
      user: this.toAuthUser(user),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      },
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await refreshTokenRepository.revokeToken(refreshToken);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await refreshTokenRepository.revokeAllForUser(userId);
    loggers.auth.info('All sessions revoked', { userId });
  }

  async getMe(userId: string): Promise<AuthUserResponse> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User');
    return this.toAuthUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw new NotFoundError('User');

    const isValid = await comparePassword(dto.currentPassword, user.password);
    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const hashedPassword = await hashPassword(dto.newPassword);
    await userRepository.updateById(userId, {
      password: hashedPassword,
      passwordChangedAt: new Date(),
    });

    await refreshTokenRepository.revokeAllForUser(userId);
    loggers.auth.info('Password changed — all sessions revoked', { userId });
  }

  private async issueTokens(user: IUser, session: SessionContext): Promise<LoginResponse> {
    const permissions = this.resolvePermissions(user.role, user.permissions);
    const tokens = generateTokenPair({
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions,
    });

    const family = uuidv4();
    await this.persistRefreshToken(user.id, tokens.refreshToken, family, session);

    return {
      user: this.toAuthUser(user),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      },
    };
  }
}

export const authService = new AuthService();
