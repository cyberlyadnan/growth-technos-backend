import { Types } from 'mongoose';
import { RefreshToken, IRefreshToken } from '../model/refreshToken.model';

export class RefreshTokenRepository {
  async create(data: Partial<IRefreshToken>): Promise<IRefreshToken> {
    return RefreshToken.create(data);
  }

  async findByToken(token: string): Promise<IRefreshToken | null> {
    return RefreshToken.findOne({ token, isRevoked: false }).exec();
  }

  async revokeToken(token: string): Promise<void> {
    await RefreshToken.updateOne({ token }, { isRevoked: true });
  }

  async revokeFamily(family: string): Promise<void> {
    await RefreshToken.updateMany({ family }, { isRevoked: true });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await RefreshToken.updateMany(
      { userId: new Types.ObjectId(userId) },
      { isRevoked: true },
    );
  }

  async deleteExpired(): Promise<void> {
    await RefreshToken.deleteMany({ expiresAt: { $lt: new Date() } });
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
