import request from 'supertest';

export type TestAgent = ReturnType<typeof request.agent>;

type CreateAuthorOptions = {
  name?: string;
  slug?: string;
};

type CreateBlogOptions = {
  title: string;
  author: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  allowComments?: boolean;
  includeInSitemap?: boolean;
  includeInRss?: boolean;
  robotsIndex?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  content?: {
    html?: string;
    plainText?: string;
  };
};

export async function createTestAuthor(
  agent: TestAgent,
  options: CreateAuthorOptions = {},
) {
  const slug = options.slug ?? `test-author-${Date.now()}`;
  const response = await agent
    .post('/api/v1/authors')
    .send({
      name: options.name ?? 'Test Author',
      slug,
    })
    .expect(201);

  return {
    id: response.body.data.id as string,
    slug: response.body.data.slug as string,
  };
}

export async function createTestCategory(
  agent: TestAgent,
  name = 'Engineering',
  slug?: string,
) {
  const finalSlug = slug ?? name.toLowerCase().replace(/\s+/g, '-');
  const response = await agent
    .post('/api/v1/categories')
    .send({ name, slug: finalSlug })
    .expect(201);

  return {
    id: response.body.data.id as string,
    slug: response.body.data.slug as string,
  };
}

export async function createTestTag(agent: TestAgent, name = 'Nextjs', slug?: string) {
  const finalSlug = slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const response = await agent
    .post('/api/v1/tags')
    .send({ name, slug: finalSlug })
    .expect(201);

  return {
    id: response.body.data.id as string,
    slug: response.body.data.slug as string,
  };
}

export async function createTestBlog(agent: TestAgent, options: CreateBlogOptions) {
  const response = await agent.post('/api/v1/blogs').send(options).expect(201);

  return {
    id: response.body.data.id as string,
    slug: response.body.data.slug as string,
    data: response.body.data,
  };
}

export async function publishTestBlog(agent: TestAgent, blogId: string) {
  await agent.post(`/api/v1/blogs/${blogId}/publish`).expect(200);
}

export async function createPublishedBlog(
  agent: TestAgent,
  options: Omit<CreateBlogOptions, 'author'> & { author?: string },
) {
  const author = options.author
    ? { id: options.author, slug: '' }
    : await createTestAuthor(agent);

  const blog = await createTestBlog(agent, {
    ...options,
    author: author.id,
  });

  await publishTestBlog(agent, blog.id);
  return blog;
}
