import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '@core/database/connection';
import { UserRole, UserStatus, Permission, DEFAULT_ROLE_PERMISSIONS } from '@core/constants';
import { hashPassword } from '@core/utils/password';
import { Role } from '@modules/roles/model/role.model';
import { User } from '@modules/users/model/user.model';
import { logger } from '@core/logger';

async function seed(): Promise<void> {
  await connectDatabase();

  const roles = Object.values(UserRole);
  for (const role of roles) {
    await Role.findOneAndUpdate(
      { slug: role },
      {
        name: role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        slug: role,
        permissions: DEFAULT_ROLE_PERMISSIONS[role] ?? [],
        isSystem: true,
        isActive: true,
      },
      { upsert: true, new: true },
    );
  }
  logger.info('System roles seeded');

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@growthtechnos.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456';
  const hashedPassword = await hashPassword(adminPassword);

  const existing = await User.findOne({ email: adminEmail });
  if (!existing) {
    await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      role: UserRole.ADMIN,
      permissions: Object.values(Permission),
      status: UserStatus.ACTIVE,
      emailVerified: true,
    });
    logger.info('Admin user created', { email: adminEmail });
  } else {
    existing.password = hashedPassword;
    existing.status = UserStatus.ACTIVE;
    existing.emailVerified = true;
    existing.role = UserRole.ADMIN;
    existing.permissions = Object.values(Permission);
    await existing.save();
    logger.info('Admin user updated (password reset)', { email: adminEmail });
  }

  await disconnectDatabase();
  process.exit(0);
}

seed().catch((error) => {
  logger.error('Seed failed', { error });
  process.exit(1);
});
