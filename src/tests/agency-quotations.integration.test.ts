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
      name: `Quote Client ${Date.now()}`,
      email: `quote-${Date.now()}@agency.test`,
      status: 'active',
    })
    .expect(201);
  return created.body.data as { id: string; code: string };
}

describe('Agency quotations', () => {
  itMongo('creates, recalculates, issues, revises, and converts to project', async () => {
    const agent = await loginAsAdmin();
    const client = await createClient(agent);

    const preview = await agent
      .post('/api/v1/agency/quotations/preview-totals')
      .send({
        taxConfig: { mode: 'exclusive', rates: [{ name: 'GST', percent: 18 }] },
        lineItems: [
          { description: 'SEO package', quantity: 1, unitPriceMinor: 5000000 },
        ],
      })
      .expect(200);
    expect(preview.body.data.grandTotalMinor).toBe(5900000);

    const created = await agent
      .post('/api/v1/agency/quotations')
      .send({
        clientId: client.id,
        title: 'SEO Growth Proposal',
        validityDays: 30,
        taxConfig: { mode: 'exclusive', rates: [{ name: 'GST', percent: 18 }] },
        lineItems: [
          { description: 'SEO package', quantity: 1, unitPriceMinor: 5000000 },
          { description: 'Content sprint', quantity: 2, unitPriceMinor: 750000, discountPercent: 0 },
        ],
        scopeOfWork: 'Technical SEO and content',
        exclusions: 'Paid ads budget',
        terms: 'Net 15',
        internalNotes: 'High priority prospect — do not show on PDF',
      })
      .expect(201);

    expect(created.body.data.code).toMatch(/^GT-QT-\d{4}-\d{4}$/);
    expect(created.body.data.status).toBe('draft');
    expect(created.body.data.grandTotalMinor).toBe(7670000);
    expect(created.body.data.internalNotes).toContain('High priority');

    const issued = await agent
      .post(`/api/v1/agency/quotations/${created.body.data.id}/issue`)
      .expect(200);
    expect(issued.body.data.status).toBe('issued');
    expect(issued.body.data.versionHistory.length).toBeGreaterThan(0);

    const lockedEdit = await agent
      .patch(`/api/v1/agency/quotations/${created.body.data.id}`)
      .send({ title: 'Should fail' });
    expect(lockedEdit.status).toBe(400);

    await agent
      .post(`/api/v1/agency/quotations/${created.body.data.id}/accept`)
      .expect(200);

    const revision = await agent
      .post(`/api/v1/agency/quotations/${created.body.data.id}/revise`)
      .send({ note: 'Scope expansion' })
      .expect(201);
    expect(revision.body.data.status).toBe('draft');
    expect(revision.body.data.version).toBe(2);
    expect(revision.body.data.documentGroupId).toBe(created.body.data.documentGroupId);

    const previous = await agent
      .get(`/api/v1/agency/quotations/${created.body.data.id}`)
      .expect(200);
    expect(previous.body.data.status).toBe('revised');
    expect(previous.body.data.supersededById).toBe(revision.body.data.id);

    // Accept the revision then convert
    await agent.post(`/api/v1/agency/quotations/${revision.body.data.id}/issue`).expect(200);
    await agent.post(`/api/v1/agency/quotations/${revision.body.data.id}/accept`).expect(200);

    const converted = await agent
      .post(`/api/v1/agency/quotations/${revision.body.data.id}/convert-to-project`)
      .send({ name: 'SEO Delivery' })
      .expect(200);
    expect(converted.body.data.created).toBe(true);
    expect(converted.body.data.projectId).toBeTruthy();

    const again = await agent
      .post(`/api/v1/agency/quotations/${revision.body.data.id}/convert-to-project`)
      .send({});
    expect(again.status).toBe(409);

    const pdf = await agent
      .get(`/api/v1/agency/quotations/${revision.body.data.id}/pdf`)
      .expect(200);
    expect(pdf.headers['content-type']).toMatch(/pdf/);
    expect(Buffer.isBuffer(pdf.body) || pdf.body?.length > 0 || pdf.text).toBeTruthy();
    // Ensure internal notes are not required in body check — PDF binary
    expect(pdf.headers['content-disposition']).toMatch(/GT-QT/i);

    await agent
      .post(`/api/v1/agency/quotations/${revision.body.data.id}/invoice-ready`)
      .expect(200);
  });

  itMongo('supports catalog items and templates', async () => {
    const agent = await loginAsAdmin();

    const catalog = await agent
      .post('/api/v1/agency/quotations/catalog')
      .send({
        name: 'Brand Audit',
        unitPriceMinor: 2500000,
        unit: 'project',
        category: 'strategy',
      })
      .expect(201);
    expect(catalog.body.data.unitPriceMinor).toBe(2500000);

    const template = await agent
      .post('/api/v1/agency/quotations/templates')
      .send({
        name: 'Starter Web Proposal',
        titleDefault: 'Website Proposal',
        taxConfig: { mode: 'exclusive', rates: [{ name: 'GST', percent: 18 }] },
        lineItems: [
          {
            description: 'Brand Audit',
            quantity: 1,
            unitPriceMinor: 2500000,
            catalogItemId: catalog.body.data.id,
          },
        ],
        terms: 'Valid 15 days',
        validityDays: 15,
      })
      .expect(201);
    expect(template.body.data.name).toBe('Starter Web Proposal');

    const list = await agent.get('/api/v1/agency/quotations/templates').expect(200);
    expect(list.body.data.some((item: { id: string }) => item.id === template.body.data.id)).toBe(
      true,
    );
  });

  itMongo('requires authentication', async () => {
    await request(app).get('/api/v1/agency/quotations').expect(401);
  });
});
