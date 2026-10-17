import request from 'supertest';
import { FormFieldType } from '@core/constants/leads';
import { EntityStatus } from '@core/schemas/base.schema';
import { app, loginAsAdmin } from './helpers/http';
import { skipWithoutMongo } from './helpers/mongo-gate';

function itMongo(name: string, fn: () => Promise<void>) {
  it(name, async () => {
    if (skipWithoutMongo()) return;
    await fn();
  });
}

async function createLead(
  agent: Awaited<ReturnType<typeof loginAsAdmin>>,
  email: string,
) {
  const form = await agent
    .post('/api/v1/leads/forms')
    .send({
      name: 'Client Convert Form',
      slug: `client-convert-${Date.now()}`,
      title: 'Convert me',
      fields: [
        { key: 'name', label: 'Name', type: FormFieldType.TEXT, required: true, order: 0 },
        { key: 'email', label: 'Email', type: FormFieldType.EMAIL, required: true, order: 1 },
        { key: 'message', label: 'Message', type: FormFieldType.TEXTAREA, required: true, order: 2 },
        { key: 'consent', label: 'Consent', type: FormFieldType.CONSENT, required: true, order: 3 },
      ],
      microcopy: { privacyNote: 'No spam.', submitLabel: 'Send' },
      status: EntityStatus.DRAFT,
    })
    .expect(201);

  await agent.post(`/api/v1/leads/forms/${form.body.data.id}/publish`).expect(200);

  const submit = await request(app)
    .post('/api/v1/leads/submit')
    .send({
      formSlug: form.body.data.slug,
      name: 'Asha Mehta',
      email,
      businessName: 'Mehta Clinics',
      message: 'Need website redesign',
      consent: true,
      city: 'Pune',
    })
    .expect(201);

  return submit.body.data.leadId as string;
}

describe('Agency clients', () => {
  itMongo('creates, lists, updates, archives, and restores a client', async () => {
    const agent = await loginAsAdmin();
    const email = `client-${Date.now()}@agency.test`;

    const created = await agent
      .post('/api/v1/agency/clients')
      .send({
        clientType: 'company',
        name: 'Horizon Retail',
        legalName: 'Horizon Retail Pvt Ltd',
        email,
        phone: '+919876543210',
        taxId: `GST${Date.now().toString().slice(-8)}`,
        tags: ['retainer', 'web'],
        paymentTermsDays: 30,
        defaultCurrency: 'INR',
        contactPersons: [
          {
            name: 'Ravi Shah',
            email: 'ravi@horizon.test',
            role: 'Owner',
            isPrimary: true,
          },
        ],
        billingAddress: {
          line1: '12 MG Road',
          city: 'Bengaluru',
          country: 'India',
        },
        notes: 'Priority account',
      })
      .expect(201);

    expect(created.body.data.code).toMatch(/^GT-CL-\d{4}-\d{4}$/);
    expect(created.body.data.email).toBe(email);
    expect(created.body.data.status).toBe('active');
    expect(created.body.data.activityLog.length).toBeGreaterThan(0);

    const list = await agent
      .get('/api/v1/agency/clients')
      .query({ search: 'Horizon Retail', page: 1, limit: 10 })
      .expect(200);

    expect(list.body.data.some((item: { id: string }) => item.id === created.body.data.id)).toBe(
      true,
    );
    expect(list.body.meta.total).toBeGreaterThan(0);

    const updated = await agent
      .patch(`/api/v1/agency/clients/${created.body.data.id}`)
      .send({ status: 'inactive', notes: 'Paused temporarily' })
      .expect(200);

    expect(updated.body.data.status).toBe('inactive');
    expect(updated.body.data.isActive).toBe(false);

    const archived = await agent
      .post(`/api/v1/agency/clients/${created.body.data.id}/archive`)
      .expect(200);
    expect(archived.body.data.status).toBe('archived');

    await agent.delete(`/api/v1/agency/clients/${created.body.data.id}`).expect(204);

    const trash = await agent
      .get('/api/v1/agency/clients')
      .query({ trashOnly: true, search: email })
      .expect(200);
    expect(trash.body.data.some((item: { id: string }) => item.id === created.body.data.id)).toBe(
      true,
    );

    const restored = await agent
      .post(`/api/v1/agency/clients/${created.body.data.id}/restore`)
      .expect(200);
    expect(restored.body.data.isDeleted).toBe(false);
  });

  itMongo('rejects duplicate emails and invalid payloads', async () => {
    const agent = await loginAsAdmin();
    const email = `dup-${Date.now()}@agency.test`;

    await agent
      .post('/api/v1/agency/clients')
      .send({ name: 'First Client', email, clientType: 'individual' })
      .expect(201);

    const duplicate = await agent
      .post('/api/v1/agency/clients')
      .send({ name: 'Second Client', email, clientType: 'individual' })
      .expect(409);
    expect(duplicate.body.message).toMatch(/email/i);

    const invalid = await agent.post('/api/v1/agency/clients').send({ email: 'not-an-email' });
    expect([400, 422]).toContain(invalid.status);
  });

  itMongo('converts a lead into a client without losing lead history', async () => {
    const agent = await loginAsAdmin();
    const email = `lead-client-${Date.now()}@agency.test`;
    const leadId = await createLead(agent, email);

    const converted = await agent
      .post(`/api/v1/leads/${leadId}/convert-to-client`)
      .send({ tags: ['converted'] })
      .expect(201);

    expect(converted.body.data.sourceLeadId).toBe(leadId);
    expect(converted.body.data.email).toBe(email);
    expect(converted.body.data.source).toBe('lead_conversion');

    const lead = await agent.get(`/api/v1/leads/${leadId}`).expect(200);
    expect(lead.body.data.convertedClientId).toBe(converted.body.data.id);
    expect(lead.body.data.status).toBe('won');
    expect(
      lead.body.data.activityLog.some(
        (entry: { type: string }) => entry.type === 'converted_to_client',
      ),
    ).toBe(true);

    const again = await agent.post(`/api/v1/leads/${leadId}/convert-to-client`).send({});
    expect(again.status).toBe(409);
  });

  itMongo('requires authentication for client endpoints', async () => {
    await request(app).get('/api/v1/agency/clients').expect(401);
    await request(app).post('/api/v1/agency/clients').send({ name: 'Nope' }).expect(401);
  });
});
