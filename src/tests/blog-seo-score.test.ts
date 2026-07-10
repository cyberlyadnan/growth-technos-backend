import { calculateBlogSeoScore } from '@core/utils/blog-seo-score';

describe('calculateBlogSeoScore', () => {
  it('returns a higher score when SEO fields are complete', () => {
    const minimal = calculateBlogSeoScore({
      title: 'Short',
    });

    const optimized = calculateBlogSeoScore({
      title: 'How to Build a Scalable Blog Platform in 2026',
      slug: 'how-to-build-scalable-blog-platform-2026',
      excerpt:
        'A practical guide to building SEO-first blog platforms with Node.js, MongoDB, and Next.js for growing businesses.',
      metaTitle: 'Scalable Blog Platform Guide for 2026',
      metaDescription:
        'Learn how to build a scalable, SEO-first blog platform with Node.js, MongoDB, and Next.js. Covers publishing workflows, caching, and media.',
      metaKeywords: ['blog cms', 'nextjs', 'seo'],
      canonicalUrl: 'https://growthtechnos.com/blog/scalable-blog-platform',
      featuredImageUrl: '/uploads/blogs/hero.webp',
      plainText: 'word '.repeat(900),
      tableOfContentsCount: 4,
      robotsIndex: true,
      includeInSitemap: true,
    });

    expect(optimized.score).toBeGreaterThan(minimal.score);
    expect(optimized.score).toBeGreaterThanOrEqual(70);
    expect(optimized.checks.some((check) => check.id === 'meta-title-length' && check.passed)).toBe(
      true,
    );
  });

  it('flags missing meta description and featured image', () => {
    const result = calculateBlogSeoScore({
      title: 'Untitled Draft',
      plainText: 'Too short',
    });

    expect(result.checks.find((check) => check.id === 'meta-description')?.passed).toBe(false);
    expect(result.checks.find((check) => check.id === 'featured-image')?.passed).toBe(false);
    expect(result.score).toBeLessThan(50);
  });
});
