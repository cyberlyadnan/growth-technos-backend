export interface CmsSeoScoreInput {
  title: string;
  slug?: string;
  shortDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  featuredImageUrl?: string;
  faqCount?: number;
  robotsIndex?: boolean;
  includeInSitemap?: boolean;
}

export function calculateCmsSeoScore(input: CmsSeoScoreInput): { score: number } {
  let score = 0;

  if (input.title.trim().length >= 10) score += 10;
  if (input.slug && input.slug.length >= 3) score += 10;
  if (input.metaTitle && input.metaTitle.length >= 20 && input.metaTitle.length <= 70) score += 15;
  if (input.metaDescription && input.metaDescription.length >= 80 && input.metaDescription.length <= 160) {
    score += 15;
  }
  if (input.shortDescription && input.shortDescription.length >= 40) score += 10;
  if (input.metaKeywords && input.metaKeywords.length >= 3) score += 10;
  if (input.canonicalUrl) score += 10;
  if (input.featuredImageUrl) score += 10;
  if ((input.faqCount ?? 0) >= 2) score += 10;
  if (input.robotsIndex !== false) score += 5;
  if (input.includeInSitemap !== false) score += 5;

  return { score: Math.min(100, score) };
}
