import request from 'supertest';

export type TestAgent = ReturnType<typeof request.agent>;

type CreateIndustryOptions = {
  name?: string;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  publicationStatus?: 'draft' | 'scheduled' | 'published' | 'archived';
  shortDescription?: string;
  description?: string;
  isFeatured?: boolean;
  displayOrder?: number;
  includeInSitemap?: boolean;
  robotsIndex?: boolean;
  faqSchema?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  hero?: Record<string, unknown>;
  problems?: Array<Record<string, unknown>>;
  solutions?: Array<Record<string, unknown>>;
  faqs?: Array<Record<string, unknown>>;
  auditCta?: Record<string, unknown>;
  finalCta?: Record<string, unknown>;
  relatedServices?: string[];
  relatedPortfolio?: string[];
  relatedBlogs?: string[];
};

type CreateServiceOptions = {
  title: string;
  slug?: string;
  shortDescription?: string;
  industries?: string[];
  relatedServices?: string[];
  relatedPortfolio?: string[];
  includeInSitemap?: boolean;
  robotsIndex?: boolean;
  content?: {
    html?: string;
    plainText?: string;
  };
};

type CreatePortfolioOptions = {
  title: string;
  slug?: string;
  projectType?: 'case_study' | 'showcase';
  shortDescription?: string;
  industries?: string[];
  relatedServices?: string[];
  relatedPortfolio?: string[];
  includeInSitemap?: boolean;
  robotsIndex?: boolean;
  content?: {
    html?: string;
    plainText?: string;
  };
};

export async function createTestIndustry(
  agent: TestAgent,
  options: CreateIndustryOptions = {},
) {
  const name = options.name ?? 'Healthcare';
  const slug = options.slug ?? name.toLowerCase().replace(/\s+/g, '-');

  const response = await agent
    .post('/api/v1/industries')
    .send({
      name,
      slug,
      description: options.description,
      metaTitle: options.metaTitle,
      metaDescription: options.metaDescription,
      shortDescription: options.shortDescription,
      isFeatured: options.isFeatured,
      displayOrder: options.displayOrder,
      includeInSitemap: options.includeInSitemap,
      robotsIndex: options.robotsIndex,
      faqSchema: options.faqSchema,
      ogTitle: options.ogTitle,
      ogDescription: options.ogDescription,
      hero: options.hero,
      problems: options.problems,
      solutions: options.solutions,
      faqs: options.faqs,
      auditCta: options.auditCta,
      finalCta: options.finalCta,
      relatedServices: options.relatedServices,
      relatedPortfolio: options.relatedPortfolio,
      relatedBlogs: options.relatedBlogs,
      publicationStatus: options.publicationStatus ?? 'published',
    })
    .expect(201);

  return {
    id: response.body.data.id as string,
    slug: response.body.data.slug as string,
    data: response.body.data,
  };
}

export async function createTestService(agent: TestAgent, options: CreateServiceOptions) {
  const response = await agent.post('/api/v1/services').send(options).expect(201);

  return {
    id: response.body.data.id as string,
    slug: response.body.data.slug as string,
    data: response.body.data,
  };
}

export async function publishTestService(agent: TestAgent, serviceId: string) {
  await agent.post(`/api/v1/services/${serviceId}/publish`).expect(200);
}

export async function createPublishedService(
  agent: TestAgent,
  options: CreateServiceOptions,
) {
  const service = await createTestService(agent, options);
  await publishTestService(agent, service.id);
  return service;
}

export async function createTestPortfolio(agent: TestAgent, options: CreatePortfolioOptions) {
  const response = await agent.post('/api/v1/portfolio').send(options).expect(201);

  return {
    id: response.body.data.id as string,
    slug: response.body.data.slug as string,
    data: response.body.data,
  };
}

export async function publishTestPortfolio(agent: TestAgent, projectId: string) {
  await agent.post(`/api/v1/portfolio/${projectId}/publish`).expect(200);
}

export async function createPublishedPortfolio(
  agent: TestAgent,
  options: CreatePortfolioOptions,
) {
  const project = await createTestPortfolio(agent, options);
  await publishTestPortfolio(agent, project.id);
  return project;
}
