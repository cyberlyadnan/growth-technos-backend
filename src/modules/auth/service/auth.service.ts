import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_ROLE_PERMISSIONS, UserRole, UserStatus } from '@core/constants';
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  TokenInvalidError,
} from '@core/errors';
import { env } from '@core/config';
import { generateTokenPair, verifyRefreshToken } from '@core/utils/jwt';
import { hashPassword, comparePassword } from '@core/utils/password';
import { generateSecureToken, hashToken } from '@core/utils/tokenHash';
import { durationToExpiryDate } from '@core/utils/duration';
import { mailService } from '@core/mail/mail.service';
import { buildPasswordResetEmail } from '@core/mail/templates/password-reset.template';
import { loggers } from '@core/logger';
import { userRepository } from '@modules/users/repository/user.repository';
import { IUser } from '@modules/users/model/user.model';
import { refreshTokenRepository } from '../repository/refreshToken.repository';
import { passwordResetTokenRepository } from '../repository/passwordResetToken.repository';
import {
  AuthUserResponse,
  ForgotPasswordResponse,
  LoginResponse,
  SessionContext,
  SessionValidationResponse,
} from '../types/auth.types';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateAvatarDto,
  UpdateProfileDto,
} from '../dto/auth.dto';

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
      status: user.status,
      avatar: user.avatar,
      phone: user.phone,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private resolvePermissions(role: UserRole, explicit?: string[]): string[] {
    if (explicit && explicit.length > 0) return explicit;
    return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
  }

  private getRefreshExpiresIn(rememberMe?: boolean): string {
    return rememberMe ? env.JWT_REFRESH_REMEMBER_EXPIRES_IN : env.JWT_REFRESH_EXPIRES_IN;
  }

  private async persistRefreshToken(
    userId: string,
    refreshToken: string,
    family: string,
    session: SessionContext,
  ): Promise<void> {
    const refreshExpiresIn = this.getRefreshExpiresIn(session.rememberMe);
    const expiresAt = durationToExpiryDate(refreshExpiresIn);

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

    const role = UserRole.ADMIN;
    const hashedPassword = await hashPassword(dto.password);

    const user = await userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone || undefined,
      role,
      permissions: this.resolvePermissions(role),
      status: UserStatus.ACTIVE,
      emailVerified: false,
      ...(createdBy && { createdBy: createdBy as unknown as IUser['createdBy'] }),
    });

    loggers.auth.info('Admin user registered', { userId: user.id, email: user.email });

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
    loggers.auth.info('User logged in', { userId: user.id, ip: session.ip, rememberMe: dto.rememberMe });

    return this.issueTokens(user, { ...session, rememberMe: dto.rememberMe });
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
    const refreshExpiresIn = this.getRefreshExpiresIn(session.rememberMe);
    const tokens = generateTokenPair(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        permissions,
      },
      { refreshExpiresIn },
    );

    await this.persistRefreshToken(user.id, tokens.refreshToken, storedToken.family, session);

    loggers.auth.info('Token refreshed', { userId: user.id });

    return {
      user: this.toAuthUser(user),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        refreshExpiresIn,
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

  async validateSession(
    userId: string,
    accessTokenExpiresAt?: number,
  ): Promise<SessionValidationResponse> {
    const user = await this.getMe(userId);

    return {
      authenticated: true,
      user,
      session: {
        accessTokenExpiresAt: accessTokenExpiresAt
          ? new Date(accessTokenExpiresAt * 1000).toISOString()
          : null,
      },
    };
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
    await passwordResetTokenRepository.deleteAllForUser(userId);
    loggers.auth.info('Password changed — all sessions revoked', { userId });
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<ForgotPasswordResponse> {
    const genericMessage =
      'If an account exists with that email, a password reset link has been sent.';

    const user = await userRepository.findByEmail(dto.email);
    if (!user || user.status !== UserStatus.ACTIVE) {
      loggers.auth.info('Forgot password requested for unknown/inactive account', {
        email: dto.email,
      });
      return { message: genericMessage };
    }

    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = durationToExpiryDate(env.PASSWORD_RESET_TOKEN_EXPIRES_IN);

    await passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const resetUrl = `${env.CLIENT_URL}/admin/reset-password?token=${rawToken}`;
    const emailContent = buildPasswordResetEmail({
      name: user.firstName,
      resetUrl,
      expiresIn: env.PASSWORD_RESET_TOKEN_EXPIRES_IN,
    });

    await mailService.send({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    loggers.auth.info('Password reset email dispatched', { userId: user.id });

    const response: ForgotPasswordResponse = { message: genericMessage };

    if (!mailService.isConfigured() && env.NODE_ENV === 'development') {
      response.resetUrl = resetUrl;
      loggers.auth.warn('SMTP not configured — reset URL logged for development', { resetUrl });
    }

    return response;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = hashToken(dto.token);
    const resetRecord = await passwordResetTokenRepository.findValidByHash(tokenHash);

    if (!resetRecord) {
      throw new TokenInvalidError('Password reset link is invalid or has expired');
    }

    const user = await userRepository.findById(resetRecord.userId.toString());
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new BadRequestError('Unable to reset password for this account');
    }

    const hashedPassword = await hashPassword(dto.password);
    await userRepository.updateById(user.id, {
      password: hashedPassword,
      passwordChangedAt: new Date(),
    });

    await passwordResetTokenRepository.markUsed(resetRecord.id);
    await refreshTokenRepository.revokeAllForUser(user.id);

    loggers.auth.info('Password reset completed', { userId: user.id });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<AuthUserResponse> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User');

    const updated = await userRepository.updateById(userId, {
      ...(dto.firstName !== undefined && { firstName: dto.firstName }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      ...(dto.phone !== undefined && { phone: dto.phone || undefined }),
      updatedBy: userId as unknown as IUser['updatedBy'],
    });

    if (!updated) throw new NotFoundError('User');
    loggers.auth.info('Profile updated', { userId });

    return this.toAuthUser(updated);
  }

  async updateAvatar(userId: string, dto: UpdateAvatarDto): Promise<AuthUserResponse> {
    const updated = await userRepository.updateById(userId, {
      avatar: dto.avatar,
      updatedBy: userId as unknown as IUser['updatedBy'],
    });

    if (!updated) throw new NotFoundError('User');
    loggers.auth.info('Profile avatar updated', { userId });

    return this.toAuthUser(updated);
  }

  private async issueTokens(user: IUser, session: SessionContext): Promise<LoginResponse> {
    const permissions = this.resolvePermissions(user.role, user.permissions);
    const refreshExpiresIn = this.getRefreshExpiresIn(session.rememberMe);
    const tokens = generateTokenPair(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        permissions,
      },
      { refreshExpiresIn },
    );

    const family = uuidv4();
    await this.persistRefreshToken(user.id, tokens.refreshToken, family, session);

    return {
      user: this.toAuthUser(user),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        refreshExpiresIn,
      },
    };
  }
}

export const authService = new AuthService();
