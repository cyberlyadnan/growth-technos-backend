export interface BlogSeoScoreInput {
  title: string;
  slug?: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  featuredImageUrl?: string;
  plainText?: string;
  tableOfContentsCount?: number;
  robotsIndex?: boolean;
  includeInSitemap?: boolean;
}

export interface BlogSeoScoreResult {
  score: number;
  checks: Array<{ id: string; label: string; passed: boolean; hint?: string; weight: number }>;
}

function wordCount(text?: string): number {
  if (!text?.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function calculateBlogSeoScore(input: BlogSeoScoreInput): BlogSeoScoreResult {
  const metaTitle = input.metaTitle?.trim() || input.title.trim();
  const metaDescription = input.metaDescription?.trim() || input.excerpt?.trim() || '';
  const metaTitleLength = metaTitle.length;
  const metaDescriptionLength = metaDescription.length;
  const contentWords = wordCount(input.plainText);
  const slug = input.slug?.trim() || slugifyFallback(input.title);

  const checks: BlogSeoScoreResult['checks'] = [
    {
      id: 'meta-title',
      label: 'Meta title set',
      passed: metaTitle.length > 0,
      weight: 8,
    },
    {
      id: 'meta-title-length',
      label: 'Meta title length (30–60 chars)',
      passed: metaTitleLength >= 30 && metaTitleLength <= 60,
      hint: `${metaTitleLength} characters`,
      weight: 12,
    },
    {
      id: 'meta-description',
      label: 'Meta description set',
      passed: metaDescription.length > 0,
      weight: 8,
    },
    {
      id: 'meta-description-length',
      label: 'Meta description length (120–160 chars)',
      passed: metaDescriptionLength >= 120 && metaDescriptionLength <= 160,
      hint: `${metaDescriptionLength} characters`,
      weight: 12,
    },
    {
      id: 'excerpt',
      label: 'Excerpt provided',
      passed: Boolean(input.excerpt?.trim()),
      weight: 8,
    },
    {
      id: 'featured-image',
      label: 'Featured image set',
      passed: Boolean(input.featuredImageUrl?.trim()),
      weight: 10,
    },
    {
      id: 'slug',
      label: 'Clean URL slug',
      passed: Boolean(slug) && slug === slug.toLowerCase() && !/[^a-z0-9-]/.test(slug),
      weight: 5,
    },
    {
      id: 'keywords',
      label: 'Meta keywords added',
      passed: Boolean(input.metaKeywords?.length),
      weight: 5,
    },
    {
      id: 'content-length',
      label: 'Substantial content (300+ words)',
      passed: contentWords >= 300,
      hint: `${contentWords} words`,
      weight: 15,
    },
    {
      id: 'table-of-contents',
      label: 'Table of contents generated',
      passed: (input.tableOfContentsCount ?? 0) >= 2,
      weight: 10,
    },
    {
      id: 'canonical',
      label: 'Canonical URL set',
      passed: Boolean(input.canonicalUrl?.trim()),
      weight: 5,
    },
    {
      id: 'indexing',
      label: 'Indexable and in sitemap',
      passed: Boolean(input.robotsIndex) && Boolean(input.includeInSitemap),
      weight: 7,
    },
  ];

  const earned = checks.filter((check) => check.passed).reduce((sum, check) => sum + check.weight, 0);
  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  const score = Math.round((earned / total) * 100);

  return { score, checks };
}

function slugifyFallback(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
