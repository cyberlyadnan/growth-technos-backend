import { calculateCmsSeoScore } from '@core/utils/cms-seo-score';

describe('calculateCmsSeoScore', () => {
  it('returns a higher score when CMS SEO fields are complete', () => {
    const minimal = calculateCmsSeoScore({
      title: 'Service',
    });

    const optimized = calculateCmsSeoScore({
      title: 'Enterprise Web Development Services for Growing Businesses',
      slug: 'enterprise-web-development-services',
      shortDescription:
        'Custom web development services for startups and enterprises looking to scale digital products.',
      metaTitle: 'Enterprise Web Development Services',
      metaDescription:
        'Growth Technos delivers scalable web development services with SEO-first architecture, modern stacks, and measurable business outcomes.',
      metaKeywords: ['web development', 'enterprise'],
      canonicalUrl: 'https://growthtechnos.com/services/enterprise-web-development-services',
      featuredImageUrl: '/uploads/services/hero.webp',
      faqCount: 3,
      robotsIndex: true,
      includeInSitemap: true,
    });

    expect(optimized.score).toBeGreaterThan(minimal.score);
    expect(optimized.score).toBeGreaterThanOrEqual(60);
  });

  it('penalizes missing metadata', () => {
    const result = calculateCmsSeoScore({
      title: 'Draft',
    });

    expect(result.score).toBeLessThan(40);
  });
});
