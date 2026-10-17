import { AuthenticationError, BadRequestError } from '@core/errors';
import { comparePassword } from '@core/utils/password';
import { User } from '@modules/users/model/user.model';

/**
 * Password reauthentication for vault-sensitive actions.
 * Does not log the password.
 */
export async function requirePasswordReauth(userId: string, currentPassword?: string): Promise<void> {
  if (!currentPassword || typeof currentPassword !== 'string') {
    throw new BadRequestError('currentPassword is required to perform this sensitive action');
  }
  const user = await User.findById(userId).select('+password').exec();
  if (!user || user.isDeleted) {
    throw new AuthenticationError('User not found');
  }
  const ok = await comparePassword(currentPassword, user.password);
  if (!ok) {
    throw new AuthenticationError('Reauthentication failed');
  }
}
