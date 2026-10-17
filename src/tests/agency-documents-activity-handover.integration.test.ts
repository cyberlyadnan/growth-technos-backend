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
      name: `Doc Client ${Date.now()}`,
      email: `doc-${Date.now()}@agency.test`,
      status: 'active',
    })
    .expect(201);
  return created.body.data as { id: string; code: string };
}

async function createProject(
  agent: Awaited<ReturnType<typeof loginAsAdmin>>,
  clientId: string,
) {
  const created = await agent
    .post('/api/v1/agency/projects')
    .send({
      clientId,
      name: `Handover Project ${Date.now()}`,
      status: 'draft',
      scope: { summary: 'Delivery scope', items: ['Build', 'Handover'] },
    })
    .expect(201);
  return created.body.data as { id: string; code: string; name: string };
}

describe('Agency documents, activity, and handover', () => {
  itMongo('enforces upload validation, auth downloads, and activity immutability', async () => {
    const agent = await loginAsAdmin();
    const guest = request.agent(app);
    const client = await createClient(agent);

    const rejected = await agent
      .post('/api/v1/agency/documents')
      .field('title', 'Bad type')
      .field('category', 'nda')
      .field('clientId', client.id)
      .attach('file', Buffer.from('not-a-real-exe'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload',
      });
    expect([400, 422]).toContain(rejected.status);

    const uploaded = await agent
      .post('/api/v1/agency/documents')
      .field('title', 'Signed NDA')
      .field('category', 'nda')
      .field('clientId', client.id)
      .field('description', 'Client mutual NDA')
      .attach('file', Buffer.from('%PDF-1.4 test nda content'), {
        filename: 'nda.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(uploaded.body.data.code).toMatch(/^GT-DOC-\d{4}-\d{4}$/);
    expect(uploaded.body.data.downloadPath).toContain('/agency/documents/');
    expect(uploaded.body.data).not.toHaveProperty('storageKey');

    const unauth = await guest
      .get(`/api/v1/agency/documents/${uploaded.body.data.id}/download`);
    expect(unauth.status).toBe(401);

    const download = await agent
      .get(`/api/v1/agency/documents/${uploaded.body.data.id}/download`)
      .expect(200);
    expect(download.headers['content-type']).toMatch(/pdf/);
    expect(download.headers['cache-control']).toMatch(/no-store/);

    const activity = await agent
      .get('/api/v1/agency/activity')
      .query({ clientId: client.id, entityType: 'document' })
      .expect(200);
    expect(activity.body.data.length).toBeGreaterThan(0);
    const uploadEvent = activity.body.data.find(
      (row: { action: string }) => row.action === 'document_uploaded',
    );
    expect(uploadEvent).toBeTruthy();
    expect(JSON.stringify(uploadEvent)).not.toMatch(/password|api[_-]?key|secret/i);

    const inv = await agent
      .post('/api/v1/agency/invoices')
      .send({
        clientId: client.id,
        title: 'Activity invoice',
        indianTax: { treatment: 'none' },
        lineItems: [{ description: 'Service', quantity: 1, unitPriceMinor: 50000 }],
      })
      .expect(201);
    await agent.post(`/api/v1/agency/invoices/${inv.body.data.id}/issue`).expect(200);

    const financial = await agent
      .get('/api/v1/agency/activity')
      .query({ clientId: client.id, entityType: 'invoice', action: 'invoice_issued' })
      .expect(200);
    expect(financial.body.data.length).toBeGreaterThan(0);
    const immutableId = financial.body.data[0].id as string;
    expect(financial.body.data[0].immutable).toBe(true);

    const patchBlocked = await agent
      .patch(`/api/v1/agency/activity/${immutableId}`)
      .send({ message: 'tamper' });
    expect(patchBlocked.status).toBe(400);

    const deleteBlocked = await agent.delete(`/api/v1/agency/activity/${immutableId}`);
    expect(deleteBlocked.status).toBe(400);
  });

  itMongo('tracks handover checklist transitions and generates branded PDF without secrets', async () => {
    const agent = await loginAsAdmin();
    const client = await createClient(agent);
    const project = await createProject(agent, client.id);

    const created = await agent
      .post('/api/v1/agency/handovers')
      .send({
        projectId: project.id,
        title: `Handover ${project.name}`,
        warrantyTerms: '90 days defect warranty',
        maintenanceTerms: 'Optional monthly retainer',
        credentialTransferNotes:
          'Transfer credentials via vault reveal — never print passwords.',
        customChecklistItems: [{ label: 'Analytics property transfer' }],
      })
      .expect(201);

    expect(created.body.data.code).toMatch(/^GT-HDO-\d{4}-\d{4}$/);
    expect(created.body.data.checklist.length).toBeGreaterThanOrEqual(10);
    expect(created.body.data.status).toBe('draft');

    const pending = created.body.data.checklist as Array<{
      id: string;
      status: string;
      label: string;
    }>;

    for (const item of pending) {
      const body: Record<string, string> = {
        itemId: item.id,
        status: 'completed',
        responsiblePerson: 'Delivery lead',
      };
      if (item.label.includes('Analytics')) {
        body.notes = 'GA4 property transferred via admin invite';
      }
      await agent
        .post(`/api/v1/agency/handovers/${created.body.data.id}/checklist-items`)
        .send(body)
        .expect(200);
    }

    const ready = await agent
      .get(`/api/v1/agency/handovers/${created.body.data.id}`)
      .expect(200);
    expect(ready.body.data.status).toBe('ready_for_review');
    expect(ready.body.data.checklistCounts.pending).toBe(0);
    expect(ready.body.data.checklistCounts.blocked).toBe(0);

    const blockedAttempt = await agent
      .post(`/api/v1/agency/handovers/${created.body.data.id}/checklist-items`)
      .send({
        itemId: pending[0].id,
        status: 'blocked',
        blockedReason: 'Should fail — already ready',
      });
    // Still allowed while not completed; force one blocked then try complete
    if (blockedAttempt.status === 200) {
      const failComplete = await agent.post(
        `/api/v1/agency/handovers/${created.body.data.id}/complete`,
      );
      expect(failComplete.status).toBe(400);

      await agent
        .post(`/api/v1/agency/handovers/${created.body.data.id}/checklist-items`)
        .send({
          itemId: pending[0].id,
          status: 'waived',
          waivedReason: 'Not applicable for this engagement',
        })
        .expect(200);
    }

    await agent
      .post(`/api/v1/agency/handovers/${created.body.data.id}/complete`)
      .expect(200);

    const completed = await agent
      .get(`/api/v1/agency/handovers/${created.body.data.id}`)
      .expect(200);
    expect(completed.body.data.status).toBe('completed');
    expect(completed.body.data.clientId).toBe(client.id);
    expect(completed.body.data.projectId).toBe(project.id);

    const pdf = await agent
      .get(`/api/v1/agency/handovers/${created.body.data.id}/pdf`)
      .expect(200);
    expect(pdf.headers['content-type']).toMatch(/pdf/);
    const pdfText = pdf.body.toString('utf8');
    expect(pdfText).toMatch(/Growth Technos|PDF/);
    expect(pdfText.toLowerCase()).not.toMatch(/api[_-]?key\s*[=:]/)
    expect(pdfText.toLowerCase()).not.toMatch(/password\s*[=:]/)

    const activity = await agent
      .get('/api/v1/agency/activity')
      .query({ projectId: project.id, entityType: 'handover', action: 'handover_completed' })
      .expect(200);
    expect(activity.body.data.length).toBeGreaterThan(0);
    expect(activity.body.data[0].immutable).toBe(true);
  });
});
