import request from 'supertest';
import { app, loginAsAdmin } from './helpers/http';
import { skipWithoutMongo } from './helpers/mongo-gate';
import { periodForDate } from '@modules/agency/maintenance/service/period.util';

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
      name: `Maint Client ${Date.now()}`,
      email: `maint-${Date.now()}@agency.test`,
      status: 'active',
    })
    .expect(201);
  return created.body.data as { id: string };
}

describe('period util', () => {
  it('builds monthly and quarterly period keys', () => {
    const monthly = periodForDate('monthly', new Date('2026-03-15T12:00:00Z'));
    expect(monthly.periodKey).toBe('2026-03');
    const quarterly = periodForDate('quarterly', new Date('2026-03-15T12:00:00Z'));
    expect(quarterly.periodKey).toBe('2026-Q1');
  });
});

describe('Agency maintenance', () => {
  itMongo('creates agreements, draft invoices, and blocks duplicates', async () => {
    const agent = await loginAsAdmin();
    const client = await createClient(agent);

    const agreement = await agent
      .post('/api/v1/agency/maintenance/agreements')
      .send({
        clientId: client.id,
        planName: 'Care Plus',
        serviceCoverage: 'WordPress care + uptime checks',
        startDate: new Date().toISOString(),
        renewalDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        billingFrequency: 'monthly',
        recurringChargeMinor: 500000,
        hostingChargeMinor: 100000,
        hostingIncluded: false,
        domainIncluded: true,
        includedWork: '2 hours/month',
        limitations: 'No redesigns',
        exclusions: 'New features',
        responseExpectations: '1 business day',
        status: 'active',
      })
      .expect(201);

    expect(agreement.body.data.code).toMatch(/^GT-MNT-/);
    expect(agreement.body.data.status).toMatch(/active|expiring_soon/);

    await agent
      .post(`/api/v1/agency/maintenance/agreements/${agreement.body.data.id}/activate`)
      .expect(200);

    const draft = await agent
      .post(
        `/api/v1/agency/maintenance/agreements/${agreement.body.data.id}/generate-draft-invoice`,
      )
      .send({})
      .expect(201);

    expect(draft.body.data.invoice.status).toBe('draft');
    expect(draft.body.data.disclaimer).toMatch(/not issued/i);
    expect(draft.body.data.invoice.maintenanceAgreementId).toBe(agreement.body.data.id);
    expect(draft.body.data.invoice.maintenancePeriodKey).toBeTruthy();

    const dup = await agent
      .post(
        `/api/v1/agency/maintenance/agreements/${agreement.body.data.id}/generate-draft-invoice`,
      )
      .send({});
    expect(dup.status).toBe(409);

    const schedules = await agent
      .get(`/api/v1/agency/maintenance/agreements/${agreement.body.data.id}/schedules`)
      .expect(200);
    expect(schedules.body.data.schedules.length).toBe(1);
    expect(schedules.body.data.schedules[0].invoiceCode).toBe(draft.body.data.invoice.code);

    const ticket = await agent
      .post('/api/v1/agency/maintenance/support')
      .send({
        clientId: client.id,
        agreementId: agreement.body.data.id,
        title: 'Plugin update',
        description: 'Update WooCommerce',
        priority: 'high',
      })
      .expect(201);

    await agent
      .post(`/api/v1/agency/maintenance/support/${ticket.body.data.id}/work-logs`)
      .send({ description: 'Updated plugin', minutesSpent: 45 })
      .expect(200);

    const detail = await agent
      .get(`/api/v1/agency/maintenance/agreements/${agreement.body.data.id}`)
      .expect(200);
    expect(detail.body.data.financials.note).toMatch(/not estimated/i);
    // Draft invoices are excluded from revenue totals
    expect(detail.body.data.financials.invoicedRevenueMinor).toBe(0);

    const alerts = await agent.get('/api/v1/agency/maintenance/renewal-alerts').expect(200);
    expect(Array.isArray(alerts.body.data.alerts)).toBe(true);

    await request(app).get('/api/v1/agency/maintenance/agreements').expect(401);
  });
});
