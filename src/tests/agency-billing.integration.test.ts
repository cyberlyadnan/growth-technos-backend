import { loginAsAdmin } from './helpers/http';
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
      name: `Billing Client ${Date.now()}`,
      email: `billing-${Date.now()}@agency.test`,
      status: 'active',
      paymentTermsDays: 15,
      billingAddress: { line1: '1 MG Road', city: 'Bengaluru', state: 'KA', country: 'IN' },
      taxId: '29AAAAA0000A1Z5',
    })
    .expect(201);
  return created.body.data as { id: string; code: string };
}

describe('Agency billing — invoices, payments, receipts', () => {
  itMongo('issues invoice, records partial payments, prevents overpay and silent edits', async () => {
    const agent = await loginAsAdmin();
    const client = await createClient(agent);

    const draft = await agent
      .post('/api/v1/agency/invoices')
      .send({
        clientId: client.id,
        title: 'Website development',
        indianTax: {
          treatment: 'intra_state',
          gstPercent: 18,
          supplierState: 'KA',
          placeOfSupplyState: 'KA',
        },
        lineItems: [{ description: 'Build', quantity: 1, unitPriceMinor: 10000000 }],
        paymentTerms: 'Net 15',
        internalNotes: 'Do not show on PDF',
      })
      .expect(201);

    expect(draft.body.data.code).toMatch(/^GT-INV-\d{4}-\d{4}$/);
    expect(draft.body.data.status).toBe('draft');
    expect(draft.body.data.grandTotalMinor).toBe(11800000);
    expect(draft.body.data.taxBreakdown.length).toBe(2);

    const issued = await agent
      .post(`/api/v1/agency/invoices/${draft.body.data.id}/issue`)
      .expect(200);
    expect(issued.body.data.status).toBe('issued');
    expect(issued.body.data.balanceDueMinor).toBe(11800000);
    expect(issued.body.data.billingSnapshot.clientName).toBeTruthy();

    const locked = await agent
      .patch(`/api/v1/agency/invoices/${draft.body.data.id}`)
      .send({ title: 'Should fail' });
    expect(locked.status).toBe(400);

    const deleteIssued = await agent.delete(`/api/v1/agency/invoices/${draft.body.data.id}`);
    expect(deleteIssued.status).toBe(400);

    const pdf = await agent
      .get(`/api/v1/agency/invoices/${draft.body.data.id}/pdf`)
      .expect(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(Buffer.isBuffer(pdf.body) || pdf.body.length > 100).toBeTruthy();

    const payment = await agent
      .post('/api/v1/agency/payments')
      .send({
        clientId: client.id,
        amountMinor: 5000000,
        method: 'upi',
        transactionRef: `UPI-${Date.now()}`,
        confirm: true,
        idempotencyKey: `idem-partial-${Date.now()}`,
        allocations: [{ invoiceId: draft.body.data.id, amountMinor: 5000000 }],
      })
      .expect(201);

    expect(payment.body.data.status).toBe('confirmed');
    expect(payment.body.data.countsAsReceived).toBe(true);
    expect(payment.body.data.receiptId).toBeTruthy();
    expect(payment.body.data.unallocatedMinor).toBe(0);

    const afterPartial = await agent
      .get(`/api/v1/agency/invoices/${draft.body.data.id}`)
      .expect(200);
    expect(afterPartial.body.data.status).toBe('partially_paid');
    expect(afterPartial.body.data.amountPaidMinor).toBe(5000000);
    expect(afterPartial.body.data.balanceDueMinor).toBe(6800000);

    const overpay = await agent.post('/api/v1/agency/payments').send({
      clientId: client.id,
      amountMinor: 9000000,
      method: 'bank_transfer',
      confirm: true,
      allocations: [{ invoiceId: draft.body.data.id, amountMinor: 9000000 }],
    });
    expect(overpay.status).toBe(400);

    const dup = await agent
      .post('/api/v1/agency/payments')
      .send({
        clientId: client.id,
        amountMinor: 100,
        method: 'cash',
        confirm: true,
        idempotencyKey: payment.body.data.idempotencyKey,
      })
      .expect(201);
    expect(dup.body.data.id).toBe(payment.body.data.id);

    const receiptPdf = await agent
      .get(`/api/v1/agency/receipts/${payment.body.data.receiptId}/pdf`)
      .expect(200);
    expect(receiptPdf.headers['content-type']).toContain('application/pdf');
  });

  itMongo('ignores pending payments for balances and supports multi-invoice allocation', async () => {
    const agent = await loginAsAdmin();
    const client = await createClient(agent);

    const invA = await agent
      .post('/api/v1/agency/invoices')
      .send({
        clientId: client.id,
        title: 'Invoice A',
        indianTax: { treatment: 'none' },
        lineItems: [{ description: 'A', quantity: 1, unitPriceMinor: 100000 }],
      })
      .expect(201);
    await agent.post(`/api/v1/agency/invoices/${invA.body.data.id}/issue`).expect(200);

    const invB = await agent
      .post('/api/v1/agency/invoices')
      .send({
        clientId: client.id,
        title: 'Invoice B',
        indianTax: { treatment: 'none' },
        lineItems: [{ description: 'B', quantity: 1, unitPriceMinor: 200000 }],
      })
      .expect(201);
    await agent.post(`/api/v1/agency/invoices/${invB.body.data.id}/issue`).expect(200);

    const pending = await agent
      .post('/api/v1/agency/payments')
      .send({
        clientId: client.id,
        amountMinor: 50000,
        method: 'cheque',
        confirm: false,
        allocations: [{ invoiceId: invA.body.data.id, amountMinor: 50000 }],
      })
      .expect(201);
    expect(pending.body.data.status).toBe('pending');
    expect(pending.body.data.countsAsReceived).toBe(false);

    const stillOpen = await agent.get(`/api/v1/agency/invoices/${invA.body.data.id}`).expect(200);
    expect(stillOpen.body.data.amountPaidMinor).toBe(0);
    expect(stillOpen.body.data.balanceDueMinor).toBe(100000);

    await agent.post(`/api/v1/agency/payments/${pending.body.data.id}/confirm`).expect(200);
    const afterConfirm = await agent
      .get(`/api/v1/agency/invoices/${invA.body.data.id}`)
      .expect(200);
    expect(afterConfirm.body.data.amountPaidMinor).toBe(50000);

    const multi = await agent
      .post('/api/v1/agency/payments')
      .send({
        clientId: client.id,
        amountMinor: 250000,
        method: 'bank_transfer',
        confirm: true,
        allocations: [
          { invoiceId: invA.body.data.id, amountMinor: 50000 },
          { invoiceId: invB.body.data.id, amountMinor: 200000 },
        ],
      })
      .expect(201);
    expect(multi.body.data.unallocatedMinor).toBe(0);

    const paidA = await agent.get(`/api/v1/agency/invoices/${invA.body.data.id}`).expect(200);
    const paidB = await agent.get(`/api/v1/agency/invoices/${invB.body.data.id}`).expect(200);
    expect(paidA.body.data.status).toBe('paid');
    expect(paidB.body.data.status).toBe('paid');
  });

  itMongo('supports credit notes, cancellation rules, refunds, and advance unallocated balance', async () => {
    const agent = await loginAsAdmin();
    const client = await createClient(agent);

    const inv = await agent
      .post('/api/v1/agency/invoices')
      .send({
        clientId: client.id,
        title: 'Cancellable',
        indianTax: { treatment: 'none' },
        lineItems: [{ description: 'Svc', quantity: 1, unitPriceMinor: 500000 }],
      })
      .expect(201);
    await agent.post(`/api/v1/agency/invoices/${inv.body.data.id}/issue`).expect(200);

    await agent
      .post(`/api/v1/agency/invoices/${inv.body.data.id}/cancel`)
      .send({ reason: 'Client withdrew' })
      .expect(200);

    const paidInv = await agent
      .post('/api/v1/agency/invoices')
      .send({
        clientId: client.id,
        title: 'Creditable',
        indianTax: { treatment: 'none' },
        lineItems: [{ description: 'Svc', quantity: 1, unitPriceMinor: 300000 }],
      })
      .expect(201);
    await agent.post(`/api/v1/agency/invoices/${paidInv.body.data.id}/issue`).expect(200);

    const pay = await agent
      .post('/api/v1/agency/payments')
      .send({
        clientId: client.id,
        amountMinor: 100000,
        method: 'upi',
        confirm: true,
        allocations: [{ invoiceId: paidInv.body.data.id, amountMinor: 100000 }],
      })
      .expect(201);

    const cancelBlocked = await agent
      .post(`/api/v1/agency/invoices/${paidInv.body.data.id}/cancel`)
      .send({ reason: 'Should fail' });
    expect(cancelBlocked.status).toBe(400);

    const credit = await agent
      .post(`/api/v1/agency/invoices/${paidInv.body.data.id}/credit-notes`)
      .send({ reason: 'Scope reduction' })
      .expect(201);
    expect(credit.body.data.kind).toBe('credit_note');
    expect(credit.body.data.code).toMatch(/^GT-INV-\d{4}-\d{4}$/);

    const afterCredit = await agent
      .get(`/api/v1/agency/invoices/${paidInv.body.data.id}`)
      .expect(200);
    expect(afterCredit.body.data.amountCreditedMinor).toBeGreaterThan(0);

    const advance = await agent
      .post('/api/v1/agency/payments')
      .send({
        clientId: client.id,
        amountMinor: 75000,
        method: 'cash',
        confirm: true,
      })
      .expect(201);
    expect(advance.body.data.unallocatedMinor).toBe(75000);
    expect(advance.body.data.receiptId).toBeTruthy();

    const refund = await agent
      .post(`/api/v1/agency/payments/${pay.body.data.id}/refund`)
      .send({ amountMinor: 100000, reason: 'Duplicate payment' })
      .expect(201);
    expect(refund.body.data.refundOfPaymentId).toBe(pay.body.data.id);
  });
});
