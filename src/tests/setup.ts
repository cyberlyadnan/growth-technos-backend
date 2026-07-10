import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserRole, UserStatus, DEFAULT_ROLE_PERMISSIONS } from '@core/constants';
import { hashPassword } from '@core/utils/password';
import { User } from '@modules/users/model/user.model';
import { TEST_ADMIN } from './helpers/constants';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const collection of Object.values(collections)) {
    await collection.deleteMany({});
  }

  const hashedPassword = await hashPassword(TEST_ADMIN.password);
  await User.create({
    firstName: TEST_ADMIN.firstName,
    lastName: TEST_ADMIN.lastName,
    email: TEST_ADMIN.email,
    password: hashedPassword,
    role: UserRole.ADMIN,
    permissions: DEFAULT_ROLE_PERMISSIONS[UserRole.ADMIN],
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
});
