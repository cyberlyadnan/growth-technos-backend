import request from 'supertest';
import { DEFAULT_ROLE_PERMISSIONS, UserRole, UserStatus } from '@core/constants';
import { hashPassword } from '@core/utils/password';
import { User } from '@modules/users/model/user.model';
import { app, loginAsAdmin } from './helpers/http';
import { TEST_ADMIN } from './helpers/constants';
import { skipWithoutMongo } from './helpers/mongo-gate';

const MARKETING = {
  email: 'marketing.rbac@growthtechnos.test',
  password: 'Marketing@123456',
  firstName: 'Market',
  lastName: 'Staff',
};

async function createMarketingUser() {
  const hashedPassword = await hashPassword(MARKETING.password);
  return User.create({
    firstName: MARKETING.firstName,
    lastName: MARKETING.lastName,
    email: MARKETING.email,
    password: hashedPassword,
    role: UserRole.MARKETING,
    permissions: DEFAULT_ROLE_PERMISSIONS[UserRole.MARKETING],
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
}

async function loginAsMarketing(agent = request.agent(app)) {
  await agent
    .post('/api/v1/auth/login')
    .send({ email: MARKETING.email, password: MARKETING.password })
    .expect(200);
  return agent;
}

describe('Marketing Staff RBAC', () => {
  it('admin can create a marketing staff account with the marketing role', async () => {
    if (skipWithoutMongo()) return;
    const agent = await loginAsAdmin();

    const response = await agent
      .post('/api/v1/users')
      .send({
        firstName: 'New',
        lastName: 'Marketer',
        email: 'new.marketer@growthtechnos.test',
        password: 'Marketer@123456',
        role: UserRole.MARKETING,
      })
      .expect(201);

    expect(response.body.data.role).toBe(UserRole.MARKETING);
  });

  it('rejects assigning super_admin via user create API', async () => {
    if (skipWithoutMongo()) return;
    const agent = await loginAsAdmin();

    await agent
      .post('/api/v1/users')
      .send({
        firstName: 'Evil',
        lastName: 'Escalation',
        email: 'evil@growthtechnos.test',
        password: 'Evil@12345678',
        role: UserRole.SUPER_ADMIN,
      })
      .expect(400);
  });

  it('marketing login receives only marketing allowlist permissions', async () => {
    if (skipWithoutMongo()) return;
    await createMarketingUser();
    const agent = request.agent(app);

    const response = await agent
      .post('/api/v1/auth/login')
      .send({ email: MARKETING.email, password: MARKETING.password })
      .expect(200);

    const permissions: string[] = response.body.data.user.permissions;
    expect(permissions).toEqual(
      expect.arrayContaining(DEFAULT_ROLE_PERMISSIONS[UserRole.MARKETING]),
    );
    expect(permissions).not.toEqual(expect.arrayContaining(['agency:read']));
    expect(permissions).not.toEqual(expect.arrayContaining(['clients:create']));
    expect(permissions).not.toEqual(expect.arrayContaining(['users:create']));
    expect(permissions).not.toEqual(expect.arrayContaining(['media:delete']));
    expect(permissions).not.toEqual(expect.arrayContaining(['content:permanent_delete']));
  });

  it('marketing can access content list and analytics stats', async () => {
    if (skipWithoutMongo()) return;
    await createMarketingUser();
    const agent = await loginAsMarketing();

    await agent.get('/api/v1/blogs').expect(200);
    await agent.get('/api/v1/analytics/stats').expect(200);
  });

  it('marketing cannot access agency foundation or clients', async () => {
    if (skipWithoutMongo()) return;
    await createMarketingUser();
    const agent = await loginAsMarketing();

    await agent.get('/api/v1/agency/foundation').expect(403);
    await agent.get('/api/v1/agency/clients').expect(403);
    await agent.get('/api/v1/agency/invoices').expect(403);
    await agent.get('/api/v1/agency/reports/executive-dashboard').expect(403);
  });

  it('marketing cannot manage users', async () => {
    if (skipWithoutMongo()) return;
    await createMarketingUser();
    const agent = await loginAsMarketing();

    await agent.get('/api/v1/users').expect(403);
    await agent
      .post('/api/v1/users')
      .send({
        firstName: 'Nope',
        lastName: 'Nope',
        email: 'nope@growthtechnos.test',
        password: 'Nope@12345678',
        role: UserRole.ADMIN,
      })
      .expect(403);
  });

  it('marketing cannot convert leads to agency clients', async () => {
    if (skipWithoutMongo()) return;
    await createMarketingUser();
    const agent = await loginAsMarketing();

    await agent
      .post('/api/v1/leads/000000000000000000000001/convert-to-client')
      .send({})
      .expect(403);
  });

  it('marketing cannot permanently delete media', async () => {
    if (skipWithoutMongo()) return;
    await createMarketingUser();
    const agent = await loginAsMarketing();

    await agent.delete('/api/v1/media/000000000000000000000001/permanent').expect(403);
    await agent.delete('/api/v1/media/000000000000000000000001').expect(403);
  });

  it('marketing cannot permanently delete content', async () => {
    if (skipWithoutMongo()) return;
    await createMarketingUser();
    const agent = await loginAsMarketing();

    await agent.delete('/api/v1/blogs/000000000000000000000001/permanent').expect(403);
  });

  it('marketing can update own profile but not escalate via profile payload', async () => {
    if (skipWithoutMongo()) return;
    await createMarketingUser();
    const agent = await loginAsMarketing();

    const updated = await agent
      .patch('/api/v1/auth/profile')
      .send({ firstName: 'Updated' })
      .expect(200);

    expect(updated.body.data.firstName).toBe('Updated');
    expect(updated.body.data.role).toBe(UserRole.MARKETING);

    // Extra fields must be ignored by schema (stripped) — role stays marketing
    const sneaky = await agent
      .patch('/api/v1/auth/profile')
      .send({ firstName: 'StillMarket', role: UserRole.ADMIN, permissions: ['agency:read'] })
      .expect(200);

    expect(sneaky.body.data.role).toBe(UserRole.MARKETING);
    expect(sneaky.body.data.permissions).not.toEqual(expect.arrayContaining(['agency:read']));
  });

  it('deactivated marketing user cannot use an old access session after status change', async () => {
    if (skipWithoutMongo()) return;
    const user = await createMarketingUser();
    const agent = await loginAsMarketing();

    await agent.get('/api/v1/blogs').expect(200);

    await User.findByIdAndUpdate(user.id, { status: UserStatus.INACTIVE });

    await agent.get('/api/v1/blogs').expect(401);
  });

  it('unauthenticated requests are rejected on protected routes', async () => {
    if (skipWithoutMongo()) return;
    await request(app).get('/api/v1/blogs').expect(401);
    await request(app).get('/api/v1/agency/foundation').expect(401);
    await request(app).get('/api/v1/users').expect(401);
  });

  it('existing admin retains agency and user management access', async () => {
    if (skipWithoutMongo()) return;
    const agent = await loginAsAdmin();

    await agent.get('/api/v1/agency/foundation').expect(200);
    await agent.get('/api/v1/users').expect(200);

    const me = await agent.get('/api/v1/auth/me').expect(200);
    expect(me.body.data.email).toBe(TEST_ADMIN.email);
    expect(me.body.data.permissions).toEqual(expect.arrayContaining(['agency:read']));
  });
});
