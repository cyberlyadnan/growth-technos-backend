import { healthcareIndustryPage, healthcareStubServices } from './industry-pages.healthcare';
import { restaurantsIndustryPage, restaurantsStubServices } from './industry-pages.restaurants';
import { salonsIndustryPage, salonsStubServices } from './industry-pages.salons';
import type { IndustryPageSeed, IndustryStubService } from './industry-pages.types';

export const INDUSTRY_PAGES: IndustryPageSeed[] = [
  healthcareIndustryPage,
  restaurantsIndustryPage,
  salonsIndustryPage,
];

export const INDUSTRY_STUB_SERVICES: IndustryStubService[] = [
  ...healthcareStubServices,
  ...restaurantsStubServices,
  ...salonsStubServices,
];

export const INDUSTRY_PAGE_SERVICE_LINKS: Record<string, string[]> = Object.fromEntries(
  INDUSTRY_PAGES.map((page) => [page.slug, page.relatedServiceSlugs]),
);

export const INDUSTRY_PAGE_PORTFOLIO_LINKS: Record<string, string[]> = Object.fromEntries(
  INDUSTRY_PAGES.map((page) => [page.slug, page.relatedPortfolioSlugs]),
);

export const INDUSTRY_PAGE_BLOG_LINKS: Record<string, string[]> = Object.fromEntries(
  INDUSTRY_PAGES.map((page) => [page.slug, page.relatedBlogSlugs]),
);

export type { IndustryPageSeed, IndustryStubService };
