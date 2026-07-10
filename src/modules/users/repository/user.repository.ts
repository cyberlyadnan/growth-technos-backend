import { UpdateQuery } from 'mongoose';
import { User, IUser } from '../model/user.model';

export class UserRepository {
  async findByEmail(email: string, includePassword = false): Promise<IUser | null> {
    const query = User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
    if (includePassword) query.select('+password');
    return query.exec();
  }

  async findById(id: string): Promise<IUser | null> {
    return User.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
  }

  async findByIdWithPassword(id: string): Promise<IUser | null> {
    return User.findOne({ _id: id, isDeleted: { $ne: true } }).select('+password').exec();
  }

  async create(data: Partial<IUser>): Promise<IUser> {
    return User.create(data);
  }

  async updateById(id: string, data: UpdateQuery<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async exists(filter: Record<string, unknown>): Promise<boolean> {
    const count = await User.countDocuments({ ...filter, isDeleted: { $ne: true } });
    return count > 0;
  }
}

export const userRepository = new UserRepository();
