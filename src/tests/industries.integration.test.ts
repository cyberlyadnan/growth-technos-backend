import request from 'supertest';
import { app, loginAsAdmin } from './helpers/http';
import { createTestIndustry } from './helpers/cms';

describe('Industries CMS — Public API', () => {
  it('lists active industries with CDN cache headers', async () => {
    const agent = await loginAsAdmin();
    await createTestIndustry(agent, { name: 'Education', slug: 'education' });

    const response = await request(app).get('/api/v1/industries/public').expect(200);

    expect(response.headers['cache-control']).toContain('s-maxage=3600');
    expect(response.body.data.some((entry: { slug: string }) => entry.slug === 'education')).toBe(
      true,
    );
  });

  it('returns industry detail by public slug with cache headers', async () => {
    const agent = await loginAsAdmin();
    const industry = await createTestIndustry(agent, {
      name: 'Logistics',
      slug: 'logistics',
      metaTitle: 'Logistics Industry Solutions',
      metaDescription: 'Digital solutions for logistics and supply chain companies.',
    });

    const response = await request(app)
      .get(`/api/v1/industries/public/slug/${industry.slug}`)
      .expect(200);

    expect(response.headers['cache-control']).toContain('s-maxage=3600');
    expect(response.body.data.metaTitle).toBe('Logistics Industry Solutions');
    expect(response.body.data.seoScore).toBeGreaterThan(0);
  });

  it('exposes sitemap feeds for indexable industries', async () => {
    const agent = await loginAsAdmin();
    await createTestIndustry(agent, {
      name: 'Manufacturing',
      slug: 'manufacturing',
    });

    const response = await request(app).get('/api/v1/industries/public/feeds').expect(200);

    expect(response.headers['cache-control']).toContain('s-maxage=3600');
    expect(
      response.body.data.sitemap.some((entry: { slug: string }) => entry.slug === 'manufacturing'),
    ).toBe(true);
  });

  it('returns 404 for deleted industries on public slug', async () => {
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
  it('computes seoScore on create and update', async () => {
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

  it('supports restore after soft delete', async () => {
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
