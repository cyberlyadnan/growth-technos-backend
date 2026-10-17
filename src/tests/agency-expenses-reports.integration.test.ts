import request from 'supertest';
import { app, loginAsAdmin } from './helpers/http';
import { skipWithoutMongo } from './helpers/mongo-gate';

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
      name: `Report Client ${Date.now()}`,
      email: `report-${Date.now()}@agency.test`,
      status: 'active',
    })
    .expect(201);
  return created.body.data as { id: string; code: string };
}

describe('Agency expenses and reports', () => {
  itMongo('records expenses with idempotency and finalization controls', async () => {
    const agent = await loginAsAdmin();
    const client = await createClient(agent);
    const idem = `exp-idem-${Date.now()}`;

    const created = await agent
      .post('/api/v1/agency/expenses')
      .send({
        expenseDate: new Date().toISOString(),
        category: 'hosting',
        vendor: 'AWS',
        description: 'Monthly hosting',
        amountMinor: 150000,
        clientId: client.id,
        paymentStatus: 'paid',
        isRecurring: true,
        recurringInterval: 'monthly',
        idempotencyKey: idem,
      })
      .expect(201);

    expect(created.body.data.code).toMatch(/^GT-EXP-\d{4}-\d{4}$/);
    expect(created.body.data.status).toBe('draft');

    const dup = await agent
      .post('/api/v1/agency/expenses')
      .send({
        expenseDate: new Date().toISOString(),
        category: 'hosting',
        vendor: 'AWS',
        description: 'Monthly hosting',
        amountMinor: 150000,
        idempotencyKey: idem,
      })
      .expect(201);
    expect(dup.body.data.id).toBe(created.body.data.id);

    await agent
      .post(`/api/v1/agency/expenses/${created.body.data.id}/finalize`)
      .expect(200);

    const blocked = await agent
      .patch(`/api/v1/agency/expenses/${created.body.data.id}`)
      .send({ description: 'Should fail' });
    expect(blocked.status).toBe(400);

    await agent
      .post(`/api/v1/agency/expenses/${created.body.data.id}/void`)
      .send({ reason: 'Wrong account' })
      .expect(200);
  });

  itMongo('builds reports that distinguish invoiced revenue from cash and match underlying records', async () => {
    const agent = await loginAsAdmin();
    const client = await createClient(agent);

    const inv = await agent
      .post('/api/v1/agency/invoices')
      .send({
        clientId: client.id,
        title: 'Report invoice',
        indianTax: { treatment: 'none' },
        lineItems: [{ description: 'Service', quantity: 1, unitPriceMinor: 1000000 }],
      })
      .expect(201);
    await agent.post(`/api/v1/agency/invoices/${inv.body.data.id}/issue`).expect(200);

    const pending = await agent
      .post('/api/v1/agency/payments')
      .send({
        clientId: client.id,
        amountMinor: 200000,
        method: 'cheque',
        confirm: false,
      })
      .expect(201);
    expect(pending.body.data.countsAsReceived).toBe(false);

    await agent
      .post('/api/v1/agency/payments')
      .send({
        clientId: client.id,
        amountMinor: 400000,
        method: 'upi',
        confirm: true,
        allocations: [{ invoiceId: inv.body.data.id, amountMinor: 400000 }],
      })
      .expect(201);

    await agent
      .post('/api/v1/agency/expenses')
      .send({
        expenseDate: new Date().toISOString(),
        category: 'contractors',
        vendor: 'Freelancer',
        description: 'Dev help',
        amountMinor: 100000,
        clientId: client.id,
        paymentStatus: 'paid',
      })
      .expect(201)
      .then(async (res) => {
        await agent.post(`/api/v1/agency/expenses/${res.body.data.id}/finalize`).expect(200);
      });

    const summary = await agent
      .get('/api/v1/agency/reports/summary')
      .query({ clientId: client.id, currency: 'INR' })
      .expect(200);

    expect(summary.body.data.totals.invoicedRevenueMinor).toBe(1000000);
    expect(summary.body.data.totals.confirmedPaymentsReceivedMinor).toBe(400000);
    expect(summary.body.data.totals.outstandingReceivablesMinor).toBe(600000);
    expect(summary.body.data.totals.recordedExpensesMinor).toBe(100000);
    expect(summary.body.data.totals.grossMarginInvoiceBasisMinor).toBe(900000);
    expect(summary.body.data.methodologyNote).toMatch(/not estimated/i);

    // Pending must not appear in cash
    expect(summary.body.data.totals.confirmedPaymentsReceivedMinor).not.toBe(600000);

    const csv = await agent
      .get('/api/v1/agency/reports/summary')
      .query({ clientId: client.id, format: 'csv' })
      .expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(String(csv.text || csv.body)).toContain('invoiced_revenue_net');

    const clients = await agent
      .get('/api/v1/agency/reports/client-balances')
      .query({ clientId: client.id })
      .expect(200);
    expect(clients.body.data.methodology.basis).toBe('mixed');
    expect(clients.body.data.items[0].outstandingMinor).toBe(600000);
    expect(clients.body.data.items[0].cashReceivedMinor).toBe(400000);

    const recurring = await agent.get('/api/v1/agency/reports/recurring').expect(200);
    expect(recurring.body.data.disclaimer).toMatch(/No projected/i);

    await request(app).get('/api/v1/agency/reports/summary').expect(401);
  });
});
