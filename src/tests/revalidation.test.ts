import {
  REVALIDATION_TAGS,
  revalidateBlogContent,
  revalidateIndustryContent,
  revalidatePortfolioContent,
  revalidateServiceContent,
} from '@core/revalidation/frontend-revalidation';

describe('Frontend revalidation triggers', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.FRONTEND_REVALIDATE_URL = 'http://localhost:3000/api/revalidate';
    process.env.REVALIDATION_SECRET = 'test-revalidation-secret';
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.FRONTEND_REVALIDATE_URL;
    delete process.env.REVALIDATION_SECRET;
  });

  async function flushRevalidation(): Promise<void> {
    await new Promise((resolve) => setImmediate(resolve));
  }

  it('does nothing when revalidation env vars are missing', async () => {
    delete process.env.FRONTEND_REVALIDATE_URL;
    delete process.env.REVALIDATION_SECRET;

    revalidateBlogContent('missing-config');
    await flushRevalidation();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('revalidates blog tags and paths including slug', async () => {
    revalidateBlogContent('launch-post');
    await flushRevalidation();

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/revalidate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-revalidation-secret',
        }),
        body: JSON.stringify({
          tags: [REVALIDATION_TAGS.blogFeeds, REVALIDATION_TAGS.blogTaxonomy],
          paths: ['/', '/blog', '/blog/launch-post'],
        }),
      }),
    );
  });

  it('revalidates service catalog tags and paths', async () => {
    revalidateServiceContent('web-development');
    await flushRevalidation();

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/revalidate',
      expect.objectContaining({
        body: JSON.stringify({
          tags: [REVALIDATION_TAGS.servicesCatalog, REVALIDATION_TAGS.servicesFeeds],
          paths: ['/', '/services', '/services/web-development'],
        }),
      }),
    );
  });

  it('revalidates portfolio catalog tags and project paths', async () => {
    revalidatePortfolioContent('acme-case-study');
    await flushRevalidation();

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/revalidate',
      expect.objectContaining({
        body: JSON.stringify({
          tags: [
            REVALIDATION_TAGS.portfolioCatalog,
            REVALIDATION_TAGS.portfolioShowcase,
            REVALIDATION_TAGS.portfolioFeeds,
          ],
          paths: ['/', '/work', '/projects/acme-case-study'],
        }),
      }),
    );
  });

  it('revalidates industry catalog and detail tags', async () => {
    revalidateIndustryContent('healthcare');
    await flushRevalidation();

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/revalidate',
      expect.objectContaining({
        body: JSON.stringify({
          tags: [
            REVALIDATION_TAGS.industriesCatalog,
            REVALIDATION_TAGS.industriesFeeds,
            REVALIDATION_TAGS.industryDetail,
          ],
          paths: ['/', '/industries', '/industries/healthcare'],
        }),
      }),
    );
  });
});
