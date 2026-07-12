import request from 'supertest';
import { EntityStatus } from '@core/schemas/base.schema';
import { FormFieldType } from '@core/constants/leads';
import { app, loginAsAdmin } from './helpers/http';
import { skipWithoutMongo } from './helpers/mongo-gate';

function itMongo(name: string, fn: () => Promise<void>) {
  it(name, async () => {
    if (skipWithoutMongo()) return;
    await fn();
  });
}

async function createPublishedContactForm(
  agent: Awaited<ReturnType<typeof loginAsAdmin>>,
) {
  const created = await agent
    .post('/api/v1/leads/forms')
    .send({
      name: 'Contact Form',
      slug: `contact-${Date.now()}`,
      title: 'Send a message',
      fields: [
        { key: 'name', label: 'Name', type: FormFieldType.TEXT, required: true, order: 0 },
        { key: 'email', label: 'Email', type: FormFieldType.EMAIL, required: true, order: 1 },
        { key: 'message', label: 'Message', type: FormFieldType.TEXTAREA, required: true, order: 2 },
        { key: 'consent', label: 'Consent', type: FormFieldType.CONSENT, required: true, order: 3 },
      ],
      microcopy: {
        privacyNote: 'No spam.',
        submitLabel: 'Send',
      },
      status: EntityStatus.DRAFT,
    })
    .expect(201);

  const id = created.body.data.id as string;
  await agent.post(`/api/v1/leads/forms/${id}/publish`).expect(200);
  return created.body.data as { id: string; slug: string };
}

describe('Lead gen — Forms & submit', () => {
  itMongo('publishes a form and serves it publicly by slug', async () => {
    const agent = await loginAsAdmin();
    const form = await createPublishedContactForm(agent);

    const response = await request(app)
      .get(`/api/v1/leads/forms/public/slug/${form.slug}`)
      .expect(200);

    expect(response.body.data.slug).toBe(form.slug);
    expect(response.body.data.fields.some((f: { key: string }) => f.key === 'email')).toBe(true);
    expect(response.headers['cache-control']).toBeDefined();
  });

  itMongo('submits a lead, stores it, and returns analytics payload', async () => {
    const agent = await loginAsAdmin();
    const form = await createPublishedContactForm(agent);

    const submit = await request(app)
      .post('/api/v1/leads/submit')
      .send({
        formSlug: form.slug,
        name: 'Priya Shah',
        email: 'priya@clinic.test',
        message: 'Need a healthcare growth audit',
        consent: true,
        industry: 'healthcare',
        landingPage: 'http://localhost:3000/industries/healthcare',
        utm: { utmSource: 'google', utmCampaign: 'healthcare_audit' },
      })
      .expect(201);

    expect(submit.body.data.leadId).toBeTruthy();
    expect(submit.body.data.analytics.event).toBe('lead_submit');
    expect(submit.body.data.analytics.formSlug).toBe(form.slug);
    expect(Array.isArray(submit.body.data.eventsTriggered)).toBe(true);

    const list = await agent.get('/api/v1/leads').query({ search: 'priya@clinic.test' }).expect(200);
    expect(list.body.data.length).toBeGreaterThan(0);
    expect(list.body.data[0].email).toBe('priya@clinic.test');
    expect(list.body.data[0].industry).toBe('healthcare');
  });

  itMongo('honeypot submissions pretend success without creating a searchable lead', async () => {
    const agent = await loginAsAdmin();
    const form = await createPublishedContactForm(agent);

    const submit = await request(app)
      .post('/api/v1/leads/submit')
      .send({
        formSlug: form.slug,
        name: 'Bot',
        email: 'bot@spam.test',
        message: 'spam',
        consent: true,
        website: 'http://spam.example',
      })
      .expect(201);

    expect(submit.body.data.leadId).toBeTruthy();

    const list = await agent.get('/api/v1/leads').query({ search: 'bot@spam.test' }).expect(200);
    expect(list.body.data.length).toBe(0);
  });

  itMongo('rejects submit when required fields are missing', async () => {
    const agent = await loginAsAdmin();
    const form = await createPublishedContactForm(agent);

    await request(app)
      .post('/api/v1/leads/submit')
      .send({
        formSlug: form.slug,
        name: 'Missing email and message',
        consent: true,
      })
      .expect(400);
  });
});

describe('Lead gen — Offers & thank-you pages', () => {
  itMongo('publishes an offer and returns it for industry context', async () => {
    const agent = await loginAsAdmin();

    const created = await agent
      .post('/api/v1/leads/offers')
      .send({
        title: 'Free Healthcare Growth Audit',
        valueLabel: 'Worth ₹10,000',
        applicableIndustries: ['healthcare'],
        displayRules: {
          industries: ['healthcare'],
          pageTypes: ['industry', 'home'],
          devices: ['all'],
          priority: 20,
        },
        priority: 20,
        ctaAction: { type: 'link', label: 'Get audit', url: '/contact' },
      })
      .expect(201);

    await agent.post(`/api/v1/leads/offers/${created.body.data.id}/publish`).expect(200);

    const publicList = await request(app)
      .get('/api/v1/leads/offers/public')
      .query({ industry: 'healthcare', pageType: 'industry' })
      .expect(200);

    expect(publicList.body.data.some((o: { title: string }) => o.title.includes('Healthcare'))).toBe(
      true,
    );
  });

  itMongo('publishes a thank-you page and serves it publicly by slug', async () => {
    const agent = await loginAsAdmin();
    const slug = `consultation-booked-${Date.now()}`;

    const created = await agent
      .post('/api/v1/leads/thank-you-pages')
      .send({
        slug,
        headline: 'Consultation requested',
        body: 'We will reply shortly.',
        timelineText: 'Within 30 minutes during business hours.',
        nextSteps: [
          { title: 'We review', description: 'Your goals and context.', order: 0 },
          { title: 'We reply', order: 1 },
        ],
        relatedResources: [{ title: 'Industries', url: '/industries' }],
        indexable: false,
      })
      .expect(201);

    await agent.post(`/api/v1/leads/thank-you-pages/${created.body.data.id}/publish`).expect(200);

    const publicPage = await request(app)
      .get(`/api/v1/leads/thank-you-pages/public/slug/${slug}`)
      .expect(200);

    expect(publicPage.body.data.headline).toBe('Consultation requested');
    expect(publicPage.body.data.nextSteps).toHaveLength(2);
    expect(publicPage.body.data.indexable).toBe(false);
  });
});

describe('Lead gen — Widgets bundle', () => {
  itMongo('returns an empty chrome bundle when nothing is published', async () => {
    const response = await request(app).get('/api/v1/leads/widgets/public').expect(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        sticky: [],
        floating: [],
        contact: null,
        whatsapp: null,
      }),
    );
  });
});
