import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserRole, UserStatus, DEFAULT_ROLE_PERMISSIONS } from '@core/constants';
import { hashPassword } from '@core/utils/password';
import { User } from '@modules/users/model/user.model';
import { TEST_ADMIN } from './helpers/constants';
import { setMongoTestReady } from './helpers/mongo-gate';

let mongoServer: MongoMemoryServer | null = null;

beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        ip: '127.0.0.1',
      },
    });
    process.env.MONGODB_URI = mongoServer.getUri();
    await mongoose.connect(process.env.MONGODB_URI);
    setMongoTestReady(true);
  } catch (error) {
    setMongoTestReady(false);
    // Keep unit suites runnable when MongoMemoryServer cannot start (common on some Windows hosts).
    // eslint-disable-next-line no-console
    console.warn(
      '[tests] MongoMemoryServer failed to start — integration tests will soft-skip.',
      error instanceof Error ? error.message : error,
    );
  }
}, 120_000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
  setMongoTestReady(false);
});

beforeEach(async () => {
  if (!mongoServer || mongoose.connection.readyState === 0) return;

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
