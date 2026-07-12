import request from 'supertest';
import { app, loginAsAdmin } from './helpers/http';
import {
  createPublishedPortfolio,
  createTestIndustry,
  createTestPortfolio,
  publishTestPortfolio,
} from './helpers/cms';

describe('Portfolio CMS — Public API', () => {
  it('lists published projects as lightweight summaries with CDN cache headers', async () => {
    const agent = await loginAsAdmin();

    await createPublishedPortfolio(agent, {
      title: 'Public Case Study Summary',
      projectType: 'case_study',
      content: {
        html: '<p>Full project body that should not appear in public list responses.</p>',
        plainText: 'Full project body that should not appear in public list responses.',
      },
    });

    const response = await request(app).get('/api/v1/portfolio/public').expect(200);

    expect(response.headers['cache-control']).toContain('s-maxage=3600');
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);

    const project = response.body.data.find(
      (entry: { slug: string }) => entry.slug === 'public-case-study-summary',
    );

    expect(project).toBeDefined();
    expect(project.content.html).toBe('');
    expect(project.content.document ?? {}).toEqual({});
  });

  it('excludes draft projects from the public list', async () => {
    const agent = await loginAsAdmin();

    await createTestPortfolio(agent, {
      title: 'Draft Project Only',
      projectType: 'case_study',
    });

    const response = await request(app).get('/api/v1/portfolio/public').expect(200);
    const slugs = response.body.data.map((entry: { slug: string }) => entry.slug);

    expect(slugs).not.toContain('draft-project-only');
  });

  it('returns full content on public slug fetch with cache headers', async () => {
    const agent = await loginAsAdmin();
    const project = await createPublishedPortfolio(agent, {
      title: 'Project Slug Detail',
      projectType: 'case_study',
      content: {
        html: '<p>Detailed project body.</p>',
      },
    });

    const response = await request(app)
      .get(`/api/v1/portfolio/public/slug/${project.slug}`)
      .expect(200);

    expect(response.headers['cache-control']).toContain('s-maxage=3600');
    expect(response.body.data.content.html).toContain('Detailed project body');
  });

  it('filters public projects by industry and project type', async () => {
    const agent = await loginAsAdmin();
    const industry = await createTestIndustry(agent, {
      name: 'Retail',
      slug: 'retail',
    });

    const project = await createPublishedPortfolio(agent, {
      title: 'Retail Case Study',
      projectType: 'case_study',
      industries: [industry.id],
    });

    const response = await request(app)
      .get('/api/v1/portfolio/public')
      .query({ industrySlug: 'retail', projectType: 'case_study' })
      .expect(200);

    expect(response.body.data.some((entry: { slug: string }) => entry.slug === project.slug)).toBe(
      true,
    );
  });

  it('exposes sitemap feeds for published projects', async () => {
    const agent = await loginAsAdmin();
    await createPublishedPortfolio(agent, {
      title: 'Sitemap Project',
      projectType: 'case_study',
      includeInSitemap: true,
      robotsIndex: true,
    });

    const response = await request(app).get('/api/v1/portfolio/public/feeds').expect(200);

    expect(response.headers['cache-control']).toContain('s-maxage=3600');
    expect(response.body.data.sitemap.some((entry: { slug: string }) => entry.slug === 'sitemap-project')).toBe(
      true,
    );
  });
});

describe('Portfolio CMS — Editorial workflow', () => {
  it('computes seoScore on create and update', async () => {
    const agent = await loginAsAdmin();

    const createResponse = await agent
      .post('/api/v1/portfolio')
      .send({
        title: 'SEO Portfolio Project',
        projectType: 'case_study',
        shortDescription: 'Initial short description for SEO scoring.',
      })
      .expect(201);

    expect(createResponse.body.data.seoScore).toBeGreaterThan(0);

    const projectId = createResponse.body.data.id as string;
    const updateResponse = await agent
      .patch(`/api/v1/portfolio/${projectId}`)
      .send({
        metaTitle: 'SEO Portfolio Project — Growth Technos',
        metaDescription:
          'Learn how Growth Technos optimizes portfolio case studies for search engines with metadata, featured images, and structured content.',
        metaKeywords: ['seo', 'portfolio'],
      })
      .expect(200);

    expect(updateResponse.body.data.seoScore).toBeGreaterThan(createResponse.body.data.seoScore);
  });

  it('supports publish, unpublish, duplicate, and bulk publish', async () => {
    const agent = await loginAsAdmin();

    const draft = await createTestPortfolio(agent, {
      title: 'Workflow Project',
      projectType: 'case_study',
    });

    await publishTestPortfolio(agent, draft.id);
    await agent.post(`/api/v1/portfolio/${draft.id}/unpublish`).expect(200);

    await publishTestPortfolio(agent, draft.id);
    const duplicate = await agent.post(`/api/v1/portfolio/${draft.id}/duplicate`).expect(201);

    expect(duplicate.body.data.title).toContain('Copy');
    expect(duplicate.body.data.publicationStatus).toBe('draft');

    const bulkDraft = await createTestPortfolio(agent, {
      title: 'Bulk Project Draft',
      projectType: 'case_study',
    });
    const bulkResponse = await agent
      .post('/api/v1/portfolio/bulk')
      .send({ action: 'publish', ids: [bulkDraft.id] })
      .expect(200);

    expect(bulkResponse.body.data.affected).toBe(1);
  });

  it('returns only published related portfolio on public slug responses', async () => {
    const agent = await loginAsAdmin();

    const relatedPublished = await createPublishedPortfolio(agent, {
      title: 'Related Published Project',
      projectType: 'case_study',
    });
    const relatedDraft = await createTestPortfolio(agent, {
      title: 'Related Draft Project',
      projectType: 'case_study',
    });

    const project = await createPublishedPortfolio(agent, {
      title: 'Project With Relations',
      projectType: 'case_study',
      relatedPortfolio: [relatedPublished.id, relatedDraft.id],
    });

    const response = await request(app)
      .get(`/api/v1/portfolio/public/slug/${project.slug}`)
      .expect(200);

    const relatedSlugs = response.body.data.relatedPortfolio.map(
      (entry: { slug: string }) => entry.slug,
    );

    expect(relatedSlugs).toContain('related-published-project');
    expect(relatedSlugs).not.toContain('related-draft-project');
  });
});
