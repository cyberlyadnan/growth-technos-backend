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
  const email = `proj-client-${Date.now()}@agency.test`;
  const created = await agent
    .post('/api/v1/agency/clients')
    .send({
      clientType: 'company',
      name: `Project Client ${Date.now()}`,
      email,
      status: 'active',
    })
    .expect(201);
  return created.body.data as { id: string; code: string; name: string };
}

describe('Agency projects', () => {
  itMongo('creates, lists, updates, and archives a project for a client', async () => {
    const agent = await loginAsAdmin();
    const client = await createClient(agent);

    const created = await agent
      .post('/api/v1/agency/projects')
      .send({
        clientId: client.id,
        name: 'Website Redesign',
        description: 'Full marketing site rebuild',
        serviceCategory: 'web',
        status: 'draft',
        priority: 'high',
        billingModel: 'milestone_based',
        contractValue: { amountMinor: 25000000, currency: 'INR' },
        estimatedCostMinor: 18000000,
        scope: {
          summary: 'Design and build marketing website',
          items: ['Discovery', 'UI design', 'Development', 'QA'],
        },
        milestones: [
          { title: 'Discovery', status: 'pending', progressPercent: 0, order: 0 },
          { title: 'Build', status: 'pending', progressPercent: 0, order: 1 },
        ],
        tasks: [{ title: 'Kickoff call', status: 'todo', priority: 'high' }],
        deliverables: [{ title: 'Staging site', status: 'pending' }],
        warrantyDays: 60,
        stagingUrl: 'https://staging.example.com',
      })
      .expect(201);

    expect(created.body.data.code).toMatch(/^GT-PRJ-\d{4}-\d{4}$/);
    expect(created.body.data.clientId).toBe(client.id);
    expect(created.body.data.financialSummary.invoicesAvailable).toBe(false);
    expect(created.body.data.invoiceIds).toEqual([]);

    const list = await agent
      .get('/api/v1/agency/projects')
      .query({ clientId: client.id, search: 'Website Redesign' })
      .expect(200);
    expect(list.body.data.some((item: { id: string }) => item.id === created.body.data.id)).toBe(
      true,
    );

    await agent
      .post(`/api/v1/agency/projects/${created.body.data.id}/status`)
      .send({ status: 'planned' })
      .expect(200);

    await agent
      .post(`/api/v1/agency/projects/${created.body.data.id}/status`)
      .send({ status: 'active' })
      .expect(200);

    const invalidComplete = await agent
      .post(`/api/v1/agency/projects/${created.body.data.id}/status`)
      .send({ status: 'completed' });
    expect(invalidComplete.status).toBe(400);

    await agent
      .post(`/api/v1/agency/projects/${created.body.data.id}/acceptance`)
      .send({ notes: 'Client signed off' })
      .expect(200);

    await agent
      .patch(`/api/v1/agency/projects/${created.body.data.id}`)
      .send({
        milestones: [
          { title: 'Discovery', status: 'done', progressPercent: 100, order: 0 },
          { title: 'Build', status: 'done', progressPercent: 100, order: 1 },
        ],
        deliverables: [{ title: 'Staging site', status: 'accepted' }],
      })
      .expect(200);

    const completed = await agent
      .post(`/api/v1/agency/projects/${created.body.data.id}/status`)
      .send({ status: 'completed' })
      .expect(200);
    expect(completed.body.data.status).toBe('completed');
    expect(completed.body.data.completionDate).toBeTruthy();

    const archived = await agent
      .post(`/api/v1/agency/projects/${created.body.data.id}/archive`)
      .expect(200);
    expect(archived.body.data.status).toBe('archived');
    expect(archived.body.data.clientId).toBe(client.id);
  });

  itMongo('rejects invalid status jumps and protects approved scope', async () => {
    const agent = await loginAsAdmin();
    const client = await createClient(agent);

    const created = await agent
      .post('/api/v1/agency/projects')
      .send({
        clientId: client.id,
        name: 'Scope Lock Project',
        status: 'draft',
        scope: { summary: 'v1 scope', items: ['A'] },
      })
      .expect(201);

    const jump = await agent
      .post(`/api/v1/agency/projects/${created.body.data.id}/status`)
      .send({ status: 'completed' });
    expect(jump.status).toBe(400);

    await agent
      .post(`/api/v1/agency/projects/${created.body.data.id}/approve-scope`)
      .send({})
      .expect(200);

    const overwrite = await agent
      .patch(`/api/v1/agency/projects/${created.body.data.id}`)
      .send({ scope: { summary: 'silent overwrite', items: ['B'] } });
    expect(overwrite.status).toBe(400);

    const change = await agent
      .post(`/api/v1/agency/projects/${created.body.data.id}/change-requests`)
      .send({
        title: 'Expand scope',
        description: 'Add analytics',
        proposedScopeSummary: 'v2 scope',
        proposedScopeItems: ['A', 'Analytics'],
      })
      .expect(201);

    const openKey = change.body.data.changeRequests.find(
      (item: { status: string }) => item.status === 'open',
    )?.key as string;

    const applied = await agent
      .post(`/api/v1/agency/projects/${created.body.data.id}/change-requests/${openKey}/resolve`)
      .send({ decision: 'approve', applyToScope: true })
      .expect(200);

    expect(applied.body.data.scope.version).toBe(2);
    expect(applied.body.data.scope.summary).toBe('v2 scope');
    expect(applied.body.data.scope.isApproved).toBe(true);
  });

  itMongo('requires auth and a real client', async () => {
    await request(app).get('/api/v1/agency/projects').expect(401);

    const agent = await loginAsAdmin();
    const missingClient = await agent.post('/api/v1/agency/projects').send({
      clientId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      name: 'Orphan project',
    });
    expect([400, 404]).toContain(missingClient.status);
  });
});
