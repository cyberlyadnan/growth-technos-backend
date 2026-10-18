import { UpdateQuery } from 'mongoose';
import { ADMIN_ROLES, PANEL_STAFF_ROLES, UserStatus } from '@core/constants';
import { buildSearchFilter } from '@core/pagination/pagination';
import { User, IUser } from '../model/user.model';

export interface FindAdminUsersOptions {
  skip: number;
  limit: number;
  sort: Record<string, 1 | -1>;
  search?: string;
  status?: UserStatus;
  role?: string;
}

export class UserRepository {
  /** Staff directory: admins + marketing (not editor/manager/viewer unless added later). */
  private staffFilter(): Record<string, unknown> {
    return {
      isDeleted: { $ne: true },
      role: { $in: PANEL_STAFF_ROLES },
    };
  }

  /** Active full administrators only — used for last-admin safety checks. */
  private adminOnlyFilter(): Record<string, unknown> {
    return {
      isDeleted: { $ne: true },
      role: { $in: ADMIN_ROLES },
    };
  }

  async findByEmail(email: string, includePassword = false): Promise<IUser | null> {
    const query = User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
    if (includePassword) query.select('+password');
    return query.exec();
  }

  async findById(id: string): Promise<IUser | null> {
    return User.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
  }

  async findAdminById(id: string): Promise<IUser | null> {
    return User.findOne({ _id: id, ...this.staffFilter() }).exec();
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

  async findAdmins(options: FindAdminUsersOptions): Promise<IUser[]> {
    const filter: Record<string, unknown> = {
      ...this.staffFilter(),
      ...buildSearchFilter(options.search, ['firstName', 'lastName', 'email', 'phone']),
    };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.role) {
      filter.role = options.role;
    }

    return User.find(filter).sort(options.sort).skip(options.skip).limit(options.limit).exec();
  }

  async countAdmins(options: Pick<FindAdminUsersOptions, 'search' | 'status' | 'role'>): Promise<number> {
    const filter: Record<string, unknown> = {
      ...this.staffFilter(),
      ...buildSearchFilter(options.search, ['firstName', 'lastName', 'email', 'phone']),
    };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.role) {
      filter.role = options.role;
    }

    return User.countDocuments(filter);
  }

  async countActiveAdmins(excludeId?: string): Promise<number> {
    const filter: Record<string, unknown> = {
      ...this.adminOnlyFilter(),
      status: UserStatus.ACTIVE,
    };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    return User.countDocuments(filter);
  }

  async softDeleteById(id: string, deletedBy: string): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.INACTIVE,
        updatedBy: deletedBy,
      },
      { new: true },
    ).exec();
  }
}

export const userRepository = new UserRepository();
