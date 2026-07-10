import request from 'supertest';
import { app, loginAsAdmin } from './helpers/http';
import {
  createPublishedBlog,
  createTestAuthor,
  createTestBlog,
  createTestCategory,
  createTestTag,
  publishTestBlog,
} from './helpers/blog';

describe('Blog CMS — Public API', () => {
  it('lists published blogs as lightweight summaries without full HTML', async () => {
    const agent = await loginAsAdmin();
    const author = await createTestAuthor(agent);

    await createTestBlog(agent, {
      title: 'Summary List Blog',
      author: author.id,
      content: {
        html: '<p>Full article body that should not appear in public list responses.</p>',
        plainText: 'Full article body that should not appear in public list responses.',
      },
    }).then(({ id }) => publishTestBlog(agent, id));

    const response = await request(app).get('/api/v1/blogs/public').expect(200);

    expect(response.headers['cache-control']).toContain('s-maxage=300');
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);

    const blog = response.body.data.find(
      (entry: { slug: string }) => entry.slug === 'summary-list-blog',
    );

    expect(blog).toBeDefined();
    expect(blog.content.html).toBe('');
    expect(blog.content.document).toEqual({});
    expect(blog.tableOfContents).toEqual([]);
    expect(blog.content.plainText.length).toBeLessThanOrEqual(280);
  });

  it('excludes draft and scheduled blogs from the public list', async () => {
    const agent = await loginAsAdmin();
    const author = await createTestAuthor(agent);

    await createTestBlog(agent, {
      title: 'Draft Only Blog',
      author: author.id,
    });

    const scheduled = await createTestBlog(agent, {
      title: 'Scheduled Blog',
      author: author.id,
    });

    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await agent
      .post(`/api/v1/blogs/${scheduled.id}/schedule`)
      .send({ scheduledPublishAt: scheduledAt })
      .expect(200);

    const response = await request(app).get('/api/v1/blogs/public').expect(200);
    const slugs = response.body.data.map((entry: { slug: string }) => entry.slug);

    expect(slugs).not.toContain('draft-only-blog');
    expect(slugs).not.toContain('scheduled-blog');
  });

  it('filters public blogs by category and tag slugs', async () => {
    const agent = await loginAsAdmin();
    const author = await createTestAuthor(agent);
    const category = await createTestCategory(agent, 'Marketing', 'marketing');
    const tag = await createTestTag(agent, 'SEO', 'seo');

    const blog = await createTestBlog(agent, {
      title: 'Filtered Marketing Blog',
      author: author.id,
      category: category.id,
      tags: [tag.id],
    });
    await publishTestBlog(agent, blog.id);

    const categoryResponse = await request(app)
      .get('/api/v1/blogs/public')
      .query({ categorySlug: 'marketing' })
      .expect(200);

    expect(categoryResponse.body.data.some((entry: { slug: string }) => entry.slug === blog.slug)).toBe(
      true,
    );

    const tagResponse = await request(app)
      .get('/api/v1/blogs/public')
      .query({ tagSlug: 'seo' })
      .expect(200);

    expect(tagResponse.body.data.some((entry: { slug: string }) => entry.slug === blog.slug)).toBe(
      true,
    );
  });

  it('returns full content and increments view count on public slug fetch', async () => {
    const agent = await loginAsAdmin();
    const blog = await createPublishedBlog(agent, {
      title: 'View Count Blog',
      content: {
        html: '<p>Detailed article body.</p>',
      },
    });

    const first = await request(app).get(`/api/v1/blogs/public/slug/${blog.slug}`).expect(200);
    const second = await request(app).get(`/api/v1/blogs/public/slug/${blog.slug}`).expect(200);

    expect(first.body.data.content.html).toContain('Detailed article body');
    expect(second.body.data.viewCount).toBe(first.body.data.viewCount + 1);
  });

  it('exposes cache-friendly public feeds and taxonomy endpoints', async () => {
    const agent = await loginAsAdmin();
    await createTestCategory(agent, 'Public Category', 'public-category');
    await createTestTag(agent, 'Public Tag', 'public-tag');
    await createPublishedBlog(agent, { title: 'Feed Blog Post' });

    const [feeds, categories, tags] = await Promise.all([
      request(app).get('/api/v1/blogs/public/feeds').expect(200),
      request(app).get('/api/v1/categories/public').expect(200),
      request(app).get('/api/v1/tags/public').expect(200),
    ]);

    expect(feeds.headers['cache-control']).toContain('s-maxage=300');
    expect(categories.headers['cache-control']).toContain('s-maxage=300');
    expect(tags.headers['cache-control']).toContain('s-maxage=300');
    expect(feeds.body.data.sitemap.length).toBeGreaterThanOrEqual(1);
    expect(categories.body.data.some((entry: { slug: string }) => entry.slug === 'public-category')).toBe(
      true,
    );
    expect(tags.body.data.some((entry: { slug: string }) => entry.slug === 'public-tag')).toBe(true);
  });
});

describe('Blog CMS — Editorial workflow', () => {
  it('computes seoScore on create and update', async () => {
    const agent = await loginAsAdmin();
    const author = await createTestAuthor(agent);

    const createResponse = await agent
      .post('/api/v1/blogs')
      .send({
        title: 'SEO Score Blog',
        author: author.id,
        excerpt: 'Initial excerpt for SEO scoring.',
        content: {
          html: '<p>Content with enough words for SEO scoring in the blog CMS integration tests.</p>',
        },
      })
      .expect(201);

    expect(createResponse.body.data.seoScore).toBeGreaterThan(0);

    const blogId = createResponse.body.data.id as string;
    const updateResponse = await agent
      .patch(`/api/v1/blogs/${blogId}`)
      .send({
        metaTitle: 'SEO Score Blog — Growth Technos Guide',
        metaDescription:
          'Learn how Growth Technos calculates SEO scores for blog posts, including metadata, content length, featured images, and indexability.',
        metaKeywords: ['seo', 'blog cms'],
        featuredImage: {
          url: 'http://localhost:5001/uploads/test-blogs/hero.png',
          alt: 'Hero image',
        },
      })
      .expect(200);

    expect(updateResponse.body.data.seoScore).toBeGreaterThan(createResponse.body.data.seoScore);
  });

  it('sanitizes dangerous HTML in blog content', async () => {
    const agent = await loginAsAdmin();
    const blog = await createPublishedBlog(agent, {
      title: 'Sanitized Blog',
      content: {
        html: '<p>Safe paragraph</p><script>alert("xss")</script>',
      },
    });

    const response = await request(app).get(`/api/v1/blogs/public/slug/${blog.slug}`).expect(200);

    expect(response.body.data.content.html).toContain('Safe paragraph');
    expect(response.body.data.content.html).not.toContain('<script');
  });

  it('soft deletes and restores a blog from trash', async () => {
    const agent = await loginAsAdmin();
    const author = await createTestAuthor(agent);
    const blog = await createTestBlog(agent, {
      title: 'Trashable Blog',
      author: author.id,
    });

    await agent.delete(`/api/v1/blogs/${blog.id}`).expect(204);
    await agent.get(`/api/v1/blogs/${blog.id}`).expect(404);

    await agent.post(`/api/v1/blogs/${blog.id}/restore`).expect(200);
    await agent.get(`/api/v1/blogs/${blog.id}`).expect(200);
  });

  it('supports schedule, unpublish, archive, duplicate, bulk publish, and autosave', async () => {
    const agent = await loginAsAdmin();
    const author = await createTestAuthor(agent);

    const scheduledBlog = await createTestBlog(agent, {
      title: 'Workflow Scheduled Blog',
      author: author.id,
    });

    const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const scheduleResponse = await agent
      .post(`/api/v1/blogs/${scheduledBlog.id}/schedule`)
      .send({ scheduledPublishAt: scheduledAt })
      .expect(200);

    expect(scheduleResponse.body.data.publicationStatus).toBe('scheduled');

    const liveBlog = await createTestBlog(agent, {
      title: 'Workflow Live Blog',
      author: author.id,
    });
    await publishTestBlog(agent, liveBlog.id);

    const unpublishResponse = await agent
      .post(`/api/v1/blogs/${liveBlog.id}/unpublish`)
      .expect(200);
    expect(unpublishResponse.body.data.publicationStatus).toBe('draft');

    await publishTestBlog(agent, liveBlog.id);
    const archiveResponse = await agent.post(`/api/v1/blogs/${liveBlog.id}/archive`).expect(200);
    expect(archiveResponse.body.data.publicationStatus).toBe('archived');

    const duplicateResponse = await agent
      .post(`/api/v1/blogs/${liveBlog.id}/duplicate`)
      .expect(201);

    expect(duplicateResponse.body.data.title).toContain('Copy');
    expect(duplicateResponse.body.data.publicationStatus).toBe('draft');

    const bulkDraftOne = await createTestBlog(agent, {
      title: 'Bulk Draft One',
      author: author.id,
    });
    const bulkDraftTwo = await createTestBlog(agent, {
      title: 'Bulk Draft Two',
      author: author.id,
    });

    const bulkResponse = await agent
      .post('/api/v1/blogs/bulk')
      .send({
        action: 'publish',
        ids: [bulkDraftOne.id, bulkDraftTwo.id],
      })
      .expect(200);

    expect(bulkResponse.body.data.affected).toBe(2);

    const autosaveBlog = await createTestBlog(agent, {
      title: 'Autosave Blog',
      author: author.id,
    });

    const autosaveResponse = await agent
      .patch(`/api/v1/blogs/${autosaveBlog.id}/autosave`)
      .send({
        title: 'Autosave Blog Updated',
        excerpt: 'Saved automatically while editing.',
      })
      .expect(200);

    expect(autosaveResponse.body.data.savedAt).toBeDefined();
  });
});

describe('Blog CMS — Comments', () => {
  it('moderates guest comments and auto-approves admin replies', async () => {
    const agent = await loginAsAdmin();
    const blog = await createPublishedBlog(agent, {
      title: 'Comment Workflow Blog',
      allowComments: true,
    });

    const guestComment = await request(app)
      .post(`/api/v1/blogs/${blog.id}/comments`)
      .send({
        guestName: 'Guest Reader',
        guestEmail: 'guest@example.com',
        content: 'Please approve this comment.',
      })
      .expect(201);

    expect(guestComment.body.data.status).toBe('pending');

    await agent
      .patch(`/api/v1/comments/${guestComment.body.data.id}/moderate`)
      .send({ status: 'approved' })
      .expect(200);

    const adminReply = await agent
      .post(`/api/v1/blogs/${blog.id}/comments`)
      .send({ content: 'Thanks for reading!' })
      .expect(201);

    expect(adminReply.body.data.status).toBe('approved');
    expect(adminReply.body.data.isAdminReply).toBe(true);

    const listResponse = await request(app).get(`/api/v1/blogs/${blog.id}/comments`).expect(200);
    expect(listResponse.body.data.length).toBe(2);
  });
});

describe('Blog CMS — Taxonomy & Media', () => {
  it('creates tags and lists them in admin and public endpoints', async () => {
    const agent = await loginAsAdmin();
    await createTestTag(agent, 'Performance', 'performance');

    const adminResponse = await agent.get('/api/v1/tags').expect(200);
    const publicResponse = await request(app).get('/api/v1/tags/public').expect(200);

    expect(adminResponse.body.data.some((entry: { slug: string }) => entry.slug === 'performance')).toBe(
      true,
    );
    expect(publicResponse.body.data.some((entry: { slug: string }) => entry.slug === 'performance')).toBe(
      true,
    );
  });

  it('uploads blog media for authenticated admins', async () => {
    const agent = await loginAsAdmin();
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    const uploadResponse = await agent
      .post('/api/v1/media/upload')
      .field('alt', 'Blog media test')
      .attach('file', pngBuffer, {
        filename: 'blog-media.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(uploadResponse.body.data.url).toContain('/uploads/test-blogs/');
    expect(uploadResponse.body.data.mimeType).toBe('image/png');
  });
});
