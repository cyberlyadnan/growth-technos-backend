import request from 'supertest';
import { app, loginAsAdmin } from './helpers/http';
import { skipWithoutMongo } from './helpers/mongo-gate';
import { TEST_ADMIN } from './helpers/constants';
import { resetVaultKeyCache } from '@core/security/vault-crypto';

function itMongo(name: string, fn: () => Promise<void>) {
  it(name, async () => {
    if (skipWithoutMongo()) return;
    await fn();
  });
}

async function createClient(agent: Awaited<ReturnType<typeof loginAsAdmin>>) {
  const created = await agent
    .post('/api/v1/agency/clients')
    .send({
      clientType: 'company',
      name: `Asset Client ${Date.now()}`,
      email: `asset-${Date.now()}@agency.test`,
      status: 'active',
    })
    .expect(201);
  return created.body.data as { id: string };
}

describe('Agency assets, credentials, renewals', () => {
  itMongo('registers assets with ownership and tracks renewals', async () => {
    const agent = await loginAsAdmin();
    const client = await createClient(agent);

    const asset = await agent
      .post('/api/v1/agency/assets')
      .send({
        clientId: client.id,
        assetType: 'domain',
        provider: 'Namecheap',
        accountName: 'client-domain',
        urlOrIdentifier: 'example.com',
        ownership: 'client_owned',
        paymentResponsibility: 'client',
        expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        sslExpiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        expectedCostMinor: 120000,
        actualCostMinor: 110000,
        clientChargeMinor: 150000,
      })
      .expect(201);

    expect(asset.body.data.code).toMatch(/^GT-AST-\d{4}-\d{4}$/);
    expect(asset.body.data.ownership).toBe('client_owned');
    expect(asset.body.data.status).toBe('expiring_soon');

    const renewal = await agent
      .post('/api/v1/agency/assets/renewals')
      .send({
        assetId: asset.body.data.id,
        kind: 'domain',
        title: 'Domain renewal',
        dueDate: asset.body.data.expiryDate,
        remindAt: new Date().toISOString(),
        channels: ['in_app', 'email'],
      })
      .expect(201);

    expect(renewal.body.data.code).toMatch(/^GT-RNW-/);

    const processed = await agent.post('/api/v1/agency/assets/renewals/process-due').expect(200);
    expect(processed.body.data.processed).toBeGreaterThanOrEqual(1);
    expect(processed.body.data.disclaimer).toMatch(/not claim/i);
    // SMTP not configured in tests — must not claim email delivery
    const match = processed.body.data.results.find(
      (r: { code: string }) => r.code === renewal.body.data.code,
    );
    expect(match.lastNotificationStatus).toBe('email_skipped_unconfigured');
    expect(processed.body.data.smtpConfigured).toBe(false);
  });

  itMongo('encrypts credentials, masks by default, audits reveal, enforces reauth', async () => {
    const agent = await loginAsAdmin();
    const client = await createClient(agent);

    const created = await agent
      .post('/api/v1/agency/assets/credentials')
      .send({
        clientId: client.id,
        label: 'Hosting panel',
        username: 'admin@example.com',
        secretType: 'password',
        secret: 'CorrectHorseBatteryStaple!',
        currentPassword: TEST_ADMIN.password,
      })
      .expect(201);

    expect(created.body.data.maskedHint).toMatch(/•/);
    expect(created.body.data.secret).toBeUndefined();
    expect(JSON.stringify(created.body)).not.toContain('CorrectHorseBatteryStaple');

    const listed = await agent.get('/api/v1/agency/assets/credentials').expect(200);
    const row = listed.body.data.find((c: { id: string }) => c.id === created.body.data.id);
    expect(row.secret).toBeUndefined();
    expect(row.cipher).toBeUndefined();

    const badReveal = await agent
      .post(`/api/v1/agency/assets/credentials/${created.body.data.id}/reveal`)
      .send({ currentPassword: 'wrong-password' });
    expect(badReveal.status).toBe(401);

    const revealed = await agent
      .post(`/api/v1/agency/assets/credentials/${created.body.data.id}/reveal`)
      .send({ currentPassword: TEST_ADMIN.password })
      .expect(200);
    expect(revealed.body.data.secret).toBe('CorrectHorseBatteryStaple!');

    const audit = await agent
      .get(`/api/v1/agency/assets/credentials/${created.body.data.id}/audit`)
      .expect(200);
    expect(audit.body.data.some((a: { action: string }) => a.action === 'revealed')).toBe(true);
    expect(JSON.stringify(audit.body)).not.toContain('CorrectHorseBatteryStaple');
  });

  itMongo('refuses credential create when vault keys are unavailable', async () => {
    const agent = await loginAsAdmin();
    const client = await createClient(agent);

    const prevVersion = process.env.AGENCY_VAULT_ACTIVE_KEY_VERSION;
    const prevKeys = process.env.AGENCY_VAULT_KEYS_JSON;
    process.env.AGENCY_VAULT_ACTIVE_KEY_VERSION = '';
    process.env.AGENCY_VAULT_KEYS_JSON = '';
    resetVaultKeyCache();

    const res = await agent.post('/api/v1/agency/assets/credentials').send({
      clientId: client.id,
      label: 'Should fail',
      secretType: 'api_key',
      secret: 'sk_test_should_not_store',
      currentPassword: TEST_ADMIN.password,
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not configured|Plaintext/i);
    expect(JSON.stringify(res.body)).not.toContain('sk_test_should_not_store');

    process.env.AGENCY_VAULT_ACTIVE_KEY_VERSION = prevVersion;
    process.env.AGENCY_VAULT_KEYS_JSON = prevKeys;
    resetVaultKeyCache();
  });

  it('rejects unauthenticated asset access', async () => {
    await request(app).get('/api/v1/agency/assets').expect(401);
    await request(app).get('/api/v1/agency/assets/credentials').expect(401);
  });
});
