import request from 'supertest';
import { UserRole, UserStatus, DEFAULT_ROLE_PERMISSIONS } from '@core/constants';
import { hashPassword } from '@core/utils/password';
import { User } from '@modules/users/model/user.model';
import { TEST_ADMIN } from './helpers/constants';
import { app, loginAsAdmin } from './helpers/http';

describe('Health API', () => {
  it('returns service health', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.version).toBe('v1');
  });
});

describe('Auth API', () => {
  it('logs in with valid credentials and sets auth cookies', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: TEST_ADMIN.email,
        password: TEST_ADMIN.password,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(TEST_ADMIN.email);
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('accessToken=')]),
    );
  });

  it('rejects invalid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: TEST_ADMIN.email,
        password: 'WrongPassword1',
      })
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  it('rejects unauthenticated session requests', async () => {
    await request(app).get('/api/v1/auth/session').expect(401);
  });

  it('returns session for authenticated admin', async () => {
    const agent = await loginAsAdmin();

    const response = await agent.get('/api/v1/auth/session').expect(200);

    expect(response.body.data.authenticated).toBe(true);
    expect(response.body.data.user.email).toBe(TEST_ADMIN.email);
  });

  it('updates profile for authenticated admin', async () => {
    const agent = await loginAsAdmin();

    const response = await agent
      .patch('/api/v1/auth/profile')
      .send({
        firstName: 'Updated',
        lastName: 'Admin',
        phone: '+91 98765 43210',
      })
      .expect(200);

    expect(response.body.data.firstName).toBe('Updated');
    expect(response.body.data.phone).toBe('+91 98765 43210');
  });

  it('logs out and clears session', async () => {
    const agent = await loginAsAdmin();

    await agent.post('/api/v1/auth/logout').expect(200);
    await agent.get('/api/v1/auth/session').expect(401);
  });
});

describe('Users API', () => {
  it('rejects unauthenticated admin user list requests', async () => {
    await request(app).get('/api/v1/users').expect(401);
  });

  it('lists admin users for authenticated admin', async () => {
    const agent = await loginAsAdmin();
    const response = await agent.get('/api/v1/users').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(response.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('creates another admin account', async () => {
    const agent = await loginAsAdmin();

    const response = await agent
      .post('/api/v1/users')
      .send({
        firstName: 'Second',
        lastName: 'Admin',
        email: 'second-admin@test.growthtechnos.com',
        password: 'Admin@123456',
        status: 'active',
      })
      .expect(201);

    expect(response.body.data.email).toBe('second-admin@test.growthtechnos.com');
    expect(response.body.data.role).toBe(UserRole.ADMIN);
  });

  it('prevents deleting the currently logged-in admin', async () => {
    const agent = await loginAsAdmin();
    const session = await agent.get('/api/v1/auth/session').expect(200);
    const currentUserId = session.body.data.user.id as string;

    const response = await agent.delete(`/api/v1/users/${currentUserId}`).expect(400);

    expect(response.body.success).toBe(false);
  });

  it('prevents deactivating the last active admin', async () => {
    const agent = await loginAsAdmin();
    const session = await agent.get('/api/v1/auth/session').expect(200);
    const currentUserId = session.body.data.user.id as string;

    const response = await agent
      .patch(`/api/v1/users/${currentUserId}`)
      .send({ status: UserStatus.INACTIVE })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('prevents deleting the last active admin', async () => {
    const hashedPassword = await hashPassword('Admin@123456');
    const extraAdmin = await User.create({
      firstName: 'Temp',
      lastName: 'Admin',
      email: 'temp-admin@test.growthtechnos.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      permissions: DEFAULT_ROLE_PERMISSIONS[UserRole.ADMIN],
      status: UserStatus.ACTIVE,
      emailVerified: true,
    });

    const agent = await loginAsAdmin();
    await agent.delete(`/api/v1/users/${extraAdmin.id}`).expect(204);

    const response = await agent
      .delete(`/api/v1/users/${(await User.findOne({ email: TEST_ADMIN.email }))!.id}`)
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});
