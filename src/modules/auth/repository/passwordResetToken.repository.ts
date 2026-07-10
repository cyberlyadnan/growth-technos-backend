import { Types } from 'mongoose';
import { PasswordResetToken, IPasswordResetToken } from '../model/passwordResetToken.model';

export class PasswordResetTokenRepository {
  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<IPasswordResetToken> {
    await PasswordResetToken.deleteMany({ userId: new Types.ObjectId(data.userId) });
    return PasswordResetToken.create({
      userId: new Types.ObjectId(data.userId),
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
    });
  }

  async findValidByHash(tokenHash: string): Promise<IPasswordResetToken | null> {
    return PasswordResetToken.findOne({
      tokenHash,
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).exec();
  }

  async markUsed(id: string): Promise<void> {
    await PasswordResetToken.updateOne({ _id: id }, { usedAt: new Date() });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await PasswordResetToken.deleteMany({ userId: new Types.ObjectId(userId) });
  }
}

export const passwordResetTokenRepository = new PasswordResetTokenRepository();
