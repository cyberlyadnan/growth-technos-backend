import request from 'supertest';
import { app, loginAsAdmin } from './helpers/http';
import { skipWithoutMongo } from './helpers/mongo-gate';

function itMongo(name: string, fn: () => Promise<void>) {
  it(name, async () => {
    if (skipWithoutMongo()) return;
    await fn();
  });
}

describe('Agency executive dashboard', () => {
  itMongo('totals match underlying invoices, payments, and expenses with filters', async () => {
    const agent = await loginAsAdmin();
    const stamp = Date.now();

    const client = await agent
      .post('/api/v1/agency/clients')
      .send({
        clientType: 'company',
        name: `Exec Client ${stamp}`,
        email: `exec-${stamp}@agency.test`,
        status: 'active',
      })
      .expect(201);

    const project = await agent
      .post('/api/v1/agency/projects')
      .send({
        clientId: client.body.data.id,
        name: `Exec Project ${stamp}`,
        status: 'active',
        serviceCategory: 'web_development',
        scope: { summary: 'Dashboard test', items: ['Build'] },
      })
      .expect(201);

    const inv = await agent
      .post('/api/v1/agency/invoices')
      .send({
        clientId: client.body.data.id,
        projectId: project.body.data.id,
        title: 'Dashboard invoice',
        indianTax: { treatment: 'none' },
        lineItems: [{ description: 'Retainer', quantity: 1, unitPriceMinor: 1000000 }],
      })
      .expect(201);
    await agent.post(`/api/v1/agency/invoices/${inv.body.data.id}/issue`).expect(200);

    const payment = await agent
      .post('/api/v1/agency/payments')
      .send({
        clientId: client.body.data.id,
        amountMinor: 400000,
        method: 'bank_transfer',
        confirm: true,
        allocations: [{ invoiceId: inv.body.data.id, amountMinor: 400000 }],
      })
      .expect(201);
    expect(payment.body.data.status).toBe('confirmed');

    await agent
      .post('/api/v1/agency/expenses')
      .send({
        expenseDate: new Date().toISOString(),
        category: 'hosting',
        vendor: 'Cloud',
        description: 'Hosting for dashboard test',
        amountMinor: 50000,
        clientId: client.body.data.id,
        projectId: project.body.data.id,
        paymentStatus: 'paid',
        idempotencyKey: `exec-exp-${stamp}`,
      })
      .expect(201)
      .then(async (res) => {
        await agent.post(`/api/v1/agency/expenses/${res.body.data.id}/finalize`).expect(200);
      });

    await agent
      .post('/api/v1/agency/quotations')
      .send({
        clientId: client.body.data.id,
        projectId: project.body.data.id,
        title: 'Awaiting quote',
        validityDays: 14,
        taxConfig: { mode: 'none', rates: [] },
        lineItems: [{ description: 'Phase 2', quantity: 1, unitPriceMinor: 200000 }],
      })
      .expect(201)
      .then(async (res) => {
        await agent.post(`/api/v1/agency/quotations/${res.body.data.id}/issue`).expect(200);
      });

    const dash = await agent
      .get('/api/v1/agency/reports/executive-dashboard')
      .query({ clientId: client.body.data.id, currency: 'INR' })
      .expect(200);

    const data = dash.body.data;
    expect(data.operations.activeClients).toBeGreaterThanOrEqual(1);
    expect(data.operations.projectsActive).toBeGreaterThanOrEqual(1);
    expect(data.operations.quotationsAwaitingDecision).toBeGreaterThanOrEqual(1);

    expect(data.finance.invoicedRevenueMinor).toBe(1000000);
    expect(data.finance.confirmedPaymentsReceivedMinor).toBe(400000);
    expect(data.finance.outstandingReceivablesMinor).toBe(600000);
    expect(data.finance.recordedExpensesMinor).toBe(50000);
    expect(data.finance.grossMarginInvoiceBasisMinor).toBe(950000);

    const web = data.revenueByServiceCategory.items.find(
      (row: { serviceCategory: string }) => row.serviceCategory === 'web_development',
    );
    expect(web?.netMinor).toBe(1000000);

    const filteredEmpty = await agent
      .get('/api/v1/agency/reports/executive-dashboard')
      .query({
        clientId: client.body.data.id,
        from: '2000-01-01',
        to: '2000-01-31',
        currency: 'INR',
      })
      .expect(200);
    expect(filteredEmpty.body.data.finance.invoicedRevenueMinor).toBe(0);
    expect(filteredEmpty.body.data.finance.confirmedPaymentsReceivedMinor).toBe(0);

    const csv = await agent
      .get('/api/v1/agency/reports/executive-dashboard')
      .query({ clientId: client.body.data.id, format: 'csv', currency: 'INR' })
      .expect(200);
    expect(csv.headers['content-type']).toMatch(/csv/);
    expect(csv.text).toMatch(/invoiced_revenue_net/);

    const pdf = await agent
      .get('/api/v1/agency/reports/executive-dashboard')
      .query({ clientId: client.body.data.id, format: 'pdf', currency: 'INR' })
      .expect(200);
    expect(pdf.headers['content-type']).toMatch(/pdf/);
    expect(Buffer.isBuffer(pdf.body) || pdf.body.length > 100).toBeTruthy();

    const denied = await request(app)
      .get('/api/v1/agency/reports/executive-dashboard')
      .expect(401);
    expect(denied.status).toBe(401);
  });
});
