import request from 'supertest';
import { app, loginAsAdmin } from './helpers/http';
import {
  createPublishedService,
  createTestIndustry,
  createTestService,
} from './helpers/cms';
import { skipWithoutMongo } from './helpers/mongo-gate';

function itMongo(name: string, fn: () => Promise<void>) {
  it(name, async () => {
    if (skipWithoutMongo()) return;
    await fn();
  });
}

describe('Industries CMS — Public API', () => {
  itMongo('lists active industries with CDN cache headers', async () => {
    const agent = await loginAsAdmin();
    await createTestIndustry(agent, { name: 'Education', slug: 'education' });

    const response = await request(app).get('/api/v1/industries/public').expect(200);

    expect(response.headers['cache-control']).toContain('s-maxage=3600');
    expect(response.body.data.some((entry: { slug: string }) => entry.slug === 'education')).toBe(
      true,
    );
  });

  itMongo('returns industry detail by public slug with cache headers', async () => {
    const agent = await loginAsAdmin();
    const industry = await createTestIndustry(agent, {
      name: 'Logistics',
      slug: 'logistics',
      metaTitle: 'Logistics Industry Solutions',
      metaDescription: 'Digital solutions for logistics and supply chain companies.',
      shortDescription: 'Digital growth systems for logistics operators.',
      hero: {
        eyebrow: 'Logistics',
        title: 'Move Freight Demand Online',
        subtitle: 'Industry solution page hero',
        badges: ['Fleet-ready'],
        stats: [{ label: 'Routes optimized', value: '120+' }],
      },
      problems: [
        {
          title: 'Fragmented ops',
          description: 'Dispatch and customer updates live in different tools.',
        },
      ],
    });

    const response = await request(app)
      .get(`/api/v1/industries/public/slug/${industry.slug}`)
      .expect(200);

    expect(response.headers['cache-control']).toContain('s-maxage=3600');
    expect(response.body.data.metaTitle).toBe('Logistics Industry Solutions');
    expect(response.body.data.seoScore).toBeGreaterThan(0);
    expect(response.body.data.publicationStatus).toBe('published');
    expect(response.body.data.shortDescription).toContain('logistics');
    expect(response.body.data.hero.title).toBe('Move Freight Demand Online');
    expect(response.body.data.problems).toHaveLength(1);
    expect(response.body.data.relatedServices).toEqual([]);
  });

  itMongo('returns full sales-page sections, SEO flags, and CTAs on public detail', async () => {
    const agent = await loginAsAdmin();
    const industry = await createTestIndustry(agent, {
      name: 'Hospitality',
      slug: 'hospitality-sales',
      metaTitle: 'Hospitality Growth Systems',
      ogTitle: 'Hospitality Digital Growth',
      ogDescription: 'Booking and brand systems for hotels and resorts.',
      faqSchema: true,
      hero: {
        title: 'Fill More Rooms With Direct Demand',
        primaryCta: { label: 'Get Audit', url: '/contact?intent=audit' },
      },
      problems: [{ title: 'OTA dependency', description: 'Margins leak to marketplaces.' }],
      solutions: [
        {
          problemTitle: 'OTA dependency',
          title: 'Direct booking funnel',
          description: 'Own-channel website and retention campaigns.',
          result: 'Higher direct bookings',
        },
      ],
      faqs: [
        {
          question: 'Do you support multi-property brands?',
          answer: 'Yes. We build shared systems with property-level pages.',
        },
      ],
      auditCta: {
        title: 'Free Hospitality Audit',
        buttonLabel: 'Request Audit',
        buttonUrl: '/contact?intent=industry-audit',
      },
      finalCta: {
        title: 'Book Strategy Call',
        buttonLabel: 'Book Call',
        buttonUrl: '/contact?intent=strategy-call',
      },
    });

    const response = await request(app)
      .get(`/api/v1/industries/public/slug/${industry.slug}`)
      .expect(200);

    expect(response.body.data.ogTitle).toBe('Hospitality Digital Growth');
    expect(response.body.data.faqSchema).toBe(true);
    expect(response.body.data.solutions).toHaveLength(1);
    expect(response.body.data.solutions[0].result).toContain('direct');
    expect(response.body.data.faqs[0].question).toContain('multi-property');
    expect(response.body.data.auditCta.title).toBe('Free Hospitality Audit');
    expect(response.body.data.finalCta.buttonUrl).toContain('strategy-call');
  });

  itMongo('populates curated related services and filters unpublished ones on public detail', async () => {
    const agent = await loginAsAdmin();
    const published = await createPublishedService(agent, {
      title: 'Hospitality SEO',
      slug: 'hospitality-seo',
      shortDescription: 'Rank for high-intent hospitality searches.',
    });
    const draft = await createTestService(agent, {
      title: 'Draft Hospitality App',
      slug: 'draft-hospitality-app',
      shortDescription: 'Should stay hidden on public industry hubs.',
    });

    const industry = await createTestIndustry(agent, {
      name: 'Hospitality Relations',
      slug: 'hospitality-relations',
      relatedServices: [published.id, draft.id],
    });

    const response = await request(app)
      .get(`/api/v1/industries/public/slug/${industry.slug}`)
      .expect(200);

    const relatedSlugs = (response.body.data.relatedServices as Array<{ slug: string }>).map(
      (item) => item.slug,
    );
    expect(relatedSlugs).toContain('hospitality-seo');
    expect(relatedSlugs).not.toContain('draft-hospitality-app');
  });

  itMongo('returns isFeatured on public list entries for hub highlighting', async () => {
    const agent = await loginAsAdmin();
    await createTestIndustry(agent, {
      name: 'Zeta Featured',
      slug: 'zeta-featured',
      isFeatured: true,
      displayOrder: 50,
    });

    const response = await request(app)
      .get('/api/v1/industries/public')
      .query({ limit: 100 })
      .expect(200);

    const featured = (response.body.data as Array<{ slug: string; isFeatured?: boolean }>).find(
      (entry) => entry.slug === 'zeta-featured',
    );
    expect(featured?.isFeatured).toBe(true);
  });

  itMongo('hides draft industries from the public API', async () => {
    const agent = await loginAsAdmin();
    await createTestIndustry(agent, {
      name: 'Draft Industry',
      slug: 'draft-industry',
      publicationStatus: 'draft',
    });

    const list = await request(app).get('/api/v1/industries/public').expect(200);
    expect(list.body.data.some((entry: { slug: string }) => entry.slug === 'draft-industry')).toBe(
      false,
    );

    await request(app).get('/api/v1/industries/public/slug/draft-industry').expect(404);
  });

  itMongo('hides archived industries from the public API', async () => {
    const agent = await loginAsAdmin();
    await createTestIndustry(agent, {
      name: 'Archived Industry',
      slug: 'archived-industry',
      publicationStatus: 'archived',
    });

    const list = await request(app).get('/api/v1/industries/public').expect(200);
    expect(
      list.body.data.some((entry: { slug: string }) => entry.slug === 'archived-industry'),
    ).toBe(false);
    await request(app).get('/api/v1/industries/public/slug/archived-industry').expect(404);
  });

  itMongo('exposes sitemap feeds for indexable industries only', async () => {
    const agent = await loginAsAdmin();
    await createTestIndustry(agent, {
      name: 'Manufacturing',
      slug: 'manufacturing',
    });
    await createTestIndustry(agent, {
      name: 'Hidden Feed Industry',
      slug: 'hidden-feed-industry',
      includeInSitemap: false,
      robotsIndex: false,
    });

    const response = await request(app).get('/api/v1/industries/public/feeds').expect(200);

    expect(response.headers['cache-control']).toContain('s-maxage=3600');
    expect(
      response.body.data.sitemap.some((entry: { slug: string }) => entry.slug === 'manufacturing'),
    ).toBe(true);
    expect(
      response.body.data.sitemap.some(
        (entry: { slug: string }) => entry.slug === 'hidden-feed-industry',
      ),
    ).toBe(false);
  });

  itMongo('returns 404 for deleted industries on public slug', async () => {
    const agent = await loginAsAdmin();
    const industry = await createTestIndustry(agent, {
      name: 'Temporary Industry',
      slug: 'temporary-industry',
    });

    await agent.delete(`/api/v1/industries/${industry.id}`).expect(204);
    await request(app).get('/api/v1/industries/public/slug/temporary-industry').expect(404);
  });
});

describe('Industries CMS — Admin workflow', () => {
  itMongo('computes seoScore on create and update', async () => {
    const agent = await loginAsAdmin();

    const createResponse = await agent
      .post('/api/v1/industries')
      .send({
        name: 'SEO Industry',
        slug: 'seo-industry',
        description: 'Industry description for SEO scoring.',
      })
      .expect(201);

    expect(createResponse.body.data.seoScore).toBeGreaterThan(0);

    const updateResponse = await agent
      .patch(`/api/v1/industries/${createResponse.body.data.id}`)
      .send({
        metaTitle: 'SEO Industry — Growth Technos',
        metaDescription:
          'Learn how Growth Technos builds industry landing pages with SEO metadata, canonical URLs, and indexability controls.',
        metaKeywords: ['seo', 'industries'],
      })
      .expect(200);

    expect(updateResponse.body.data.seoScore).toBeGreaterThan(createResponse.body.data.seoScore);
  });

  itMongo('publishes a draft industry so it becomes publicly visible', async () => {
    const agent = await loginAsAdmin();
    const industry = await createTestIndustry(agent, {
      name: 'Publishable Industry',
      slug: 'publishable-industry',
      publicationStatus: 'draft',
    });

    await request(app).get('/api/v1/industries/public/slug/publishable-industry').expect(404);

    await agent
      .patch(`/api/v1/industries/${industry.id}`)
      .send({ publicationStatus: 'published' })
      .expect(200);

    const response = await request(app)
      .get('/api/v1/industries/public/slug/publishable-industry')
      .expect(200);
    expect(response.body.data.publicationStatus).toBe('published');
  });

  itMongo('rejects invalid create payloads', async () => {
    const agent = await loginAsAdmin();

    const response = await agent.post('/api/v1/industries').send({ name: '' }).expect(400);

    expect(response.body.success).toBe(false);
  });

  itMongo('supports restore after soft delete', async () => {
    const agent = await loginAsAdmin();
    const industry = await createTestIndustry(agent, {
      name: 'Restorable Industry',
      slug: 'restorable-industry',
    });

    await agent.delete(`/api/v1/industries/${industry.id}`).expect(204);
    await agent.post(`/api/v1/industries/${industry.id}/restore`).expect(200);

    const response = await request(app)
      .get('/api/v1/industries/public/slug/restorable-industry')
      .expect(200);

    expect(response.body.data.slug).toBe('restorable-industry');
  });
});
