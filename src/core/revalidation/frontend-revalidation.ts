import { loggers } from '@core/logger';

export const REVALIDATION_TAGS = {
  blogFeeds: 'blog-feeds',
  blogTaxonomy: 'blog-taxonomy',
  servicesCatalog: 'services-catalog',
  servicesFeeds: 'services-feeds',
  portfolioCatalog: 'portfolio-catalog',
  portfolioShowcase: 'portfolio-showcase',
  portfolioFeeds: 'portfolio-feeds',
  industriesCatalog: 'industries-catalog',
  industriesFeeds: 'industries-feeds',
  industryDetail: 'industry-detail',
} as const;

type RevalidationPayload = {
  tags?: string[];
  paths?: string[];
};

async function triggerFrontendRevalidation(payload: RevalidationPayload): Promise<void> {
  const url = process.env.FRONTEND_REVALIDATE_URL;
  const secret = process.env.REVALIDATION_SECRET;

  if (!url || !secret) return;

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) throw new Error(`Revalidation returned HTTP ${response.status}`);
    })
    .catch((error) => {
      loggers.api.warn('Frontend cache revalidation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
}

export function revalidateBlogContent(slug?: string): Promise<void> {
  return triggerFrontendRevalidation({
    tags: [REVALIDATION_TAGS.blogFeeds, REVALIDATION_TAGS.blogTaxonomy],
    paths: slug
      ? ['/', '/blog', '/sitemap.xml', '/blog/rss.xml', `/blog/${slug}`]
      : ['/', '/blog', '/sitemap.xml', '/blog/rss.xml'],
  });
}

export function revalidateServiceContent(slug?: string): void {
  triggerFrontendRevalidation({
    tags: [REVALIDATION_TAGS.servicesCatalog, REVALIDATION_TAGS.servicesFeeds],
    paths: slug ? ['/', '/services', `/services/${slug}`] : ['/', '/services'],
  });
}

export function revalidatePortfolioContent(slug?: string): void {
  triggerFrontendRevalidation({
    tags: [
      REVALIDATION_TAGS.portfolioCatalog,
      REVALIDATION_TAGS.portfolioShowcase,
      REVALIDATION_TAGS.portfolioFeeds,
    ],
    paths: slug ? ['/', '/work', `/projects/${slug}`] : ['/', '/work'],
  });
}

export function revalidateIndustryContent(slug?: string): void {
  triggerFrontendRevalidation({
    tags: [
      REVALIDATION_TAGS.industriesCatalog,
      REVALIDATION_TAGS.industriesFeeds,
      REVALIDATION_TAGS.industryDetail,
    ],
    paths: slug ? ['/', '/industries', `/industries/${slug}`] : ['/', '/industries'],
  });
}
