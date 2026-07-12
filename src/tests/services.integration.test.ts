import request from 'supertest';
import { app, loginAsAdmin } from './helpers/http';
import {
  createPublishedService,
  createTestIndustry,
  createTestService,
  publishTestService,
} from './helpers/cms';

describe('Services CMS — Public API', () => {
  it('lists published services as lightweight summaries with CDN cache headers', async () => {
    const agent = await loginAsAdmin();

    await createPublishedService(agent, {
      title: 'Public Service Summary',
      content: {
        html: '<p>Full service body that should not appear in public list responses.</p>',
        plainText: 'Full service body that should not appear in public list responses.',
      },
    });

    const response = await request(app).get('/api/v1/services/public').expect(200);

    expect(response.headers['cache-control']).toContain('s-maxage=3600');
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);

    const service = response.body.data.find(
      (entry: { slug: string }) => entry.slug === 'public-service-summary',
    );

    expect(service).toBeDefined();
    expect(service.content.html).toBe('');
    expect(service.content.document ?? {}).toEqual({});
  });

  it('excludes draft services from the public list', async () => {
    const agent = await loginAsAdmin();

    await createTestService(agent, {
      title: 'Draft Service Only',
    });

    const response = await request(app).get('/api/v1/services/public').expect(200);
    const slugs = response.body.data.map((entry: { slug: string }) => entry.slug);

    expect(slugs).not.toContain('draft-service-only');
  });

  it('returns full content on public slug fetch with cache headers', async () => {
    const agent = await loginAsAdmin();
    const service = await createPublishedService(agent, {
      title: 'Service Slug Detail',
      content: {
        html: '<p>Detailed service body.</p>',
      },
    });

    const response = await request(app)
      .get(`/api/v1/services/public/slug/${service.slug}`)
      .expect(200);

    expect(response.headers['cache-control']).toContain('s-maxage=3600');
    expect(response.body.data.content.html).toContain('Detailed service body');
  });

  it('filters public services by industry slug', async () => {
    const agent = await loginAsAdmin();
    const industry = await createTestIndustry(agent, {
      name: 'FinTech',
      slug: 'fintech',
    });

    const service = await createPublishedService(agent, {
      title: 'FinTech Service',
      industries: [industry.id],
    });

    const response = await request(app)
      .get('/api/v1/services/public')
      .query({ industrySlug: 'fintech' })
      .expect(200);

    expect(response.body.data.some((entry: { slug: string }) => entry.slug === service.slug)).toBe(
      true,
    );
  });

  it('exposes sitemap feeds for published services', async () => {
    const agent = await loginAsAdmin();
    await createPublishedService(agent, {
      title: 'Sitemap Service',
      includeInSitemap: true,
      robotsIndex: true,
    });

    const response = await request(app).get('/api/v1/services/public/feeds').expect(200);

    expect(response.headers['cache-control']).toContain('s-maxage=3600');
    expect(response.body.data.sitemap.some((entry: { slug: string }) => entry.slug === 'sitemap-service')).toBe(
      true,
    );
  });
});

describe('Services CMS — Editorial workflow', () => {
  it('computes seoScore on create and update', async () => {
    const agent = await loginAsAdmin();

    const createResponse = await agent
      .post('/api/v1/services')
      .send({
        title: 'SEO Service',
        shortDescription: 'Initial short description for SEO scoring.',
      })
      .expect(201);

    expect(createResponse.body.data.seoScore).toBeGreaterThan(0);

    const serviceId = createResponse.body.data.id as string;
    const updateResponse = await agent
      .patch(`/api/v1/services/${serviceId}`)
      .send({
        metaTitle: 'SEO Service — Growth Technos',
        metaDescription:
          'Learn how Growth Technos optimizes service pages for search engines with metadata, FAQs, featured images, and structured content.',
        metaKeywords: ['seo', 'services'],
      })
      .expect(200);

    expect(updateResponse.body.data.seoScore).toBeGreaterThan(createResponse.body.data.seoScore);
  });

  it('supports publish, unpublish, duplicate, and bulk publish', async () => {
    const agent = await loginAsAdmin();

    const draft = await createTestService(agent, {
      title: 'Workflow Service',
    });

    await publishTestService(agent, draft.id);
    await agent.post(`/api/v1/services/${draft.id}/unpublish`).expect(200);

    await publishTestService(agent, draft.id);
    const duplicate = await agent.post(`/api/v1/services/${draft.id}/duplicate`).expect(201);

    expect(duplicate.body.data.title).toContain('Copy');
    expect(duplicate.body.data.publicationStatus).toBe('draft');

    const bulkDraft = await createTestService(agent, { title: 'Bulk Service Draft' });
    const bulkResponse = await agent
      .post('/api/v1/services/bulk')
      .send({ action: 'publish', ids: [bulkDraft.id] })
      .expect(200);

    expect(bulkResponse.body.data.affected).toBe(1);
  });

  it('returns only published related services on public slug responses', async () => {
    const agent = await loginAsAdmin();

    const relatedPublished = await createPublishedService(agent, {
      title: 'Related Published Service',
    });
    const relatedDraft = await createTestService(agent, {
      title: 'Related Draft Service',
    });

    const service = await createPublishedService(agent, {
      title: 'Service With Relations',
      relatedServices: [relatedPublished.id, relatedDraft.id],
    });

    const response = await request(app)
      .get(`/api/v1/services/public/slug/${service.slug}`)
      .expect(200);

    const relatedSlugs = response.body.data.relatedServices.map(
      (entry: { slug: string }) => entry.slug,
    );

    expect(relatedSlugs).toContain('related-published-service');
    expect(relatedSlugs).not.toContain('related-draft-service');
  });
});
