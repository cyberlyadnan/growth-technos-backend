import { Types } from 'mongoose';
import { CmsPublicationStatus, ServiceKind } from '@core/constants/cms';
import { Blog } from '@modules/blogs/model/blog.model';
import { Industry } from '@modules/industries/model/industry.model';
import { PortfolioProject } from '@modules/portfolio/model/portfolio.model';
import { Service } from '@modules/services/model/service.model';
import { logger } from '@core/logger';
import {
  INDUSTRY_PAGES,
  INDUSTRY_PAGE_BLOG_LINKS,
  INDUSTRY_PAGE_PORTFOLIO_LINKS,
  INDUSTRY_PAGE_SERVICE_LINKS,
  INDUSTRY_STUB_SERVICES,
} from './industry-pages.index';
import type { IndustryPageSeed, IndustryStubService } from './industry-pages.types';

export const SITE_URL = (process.env.APP_URL ?? 'https://growthtechnos.com').replace(/\/$/, '');

function calculateSeoScore(seed: IndustryPageSeed): number {
  let score = 0;
  if (seed.metaTitle) score += 15;
  if (seed.metaDescription) score += 15;
  if (seed.metaKeywords.length >= 5) score += 10;
  if (seed.ogTitle && seed.ogDescription) score += 10;
  if (seed.ogImage) score += 5;
  if (seed.faqs.length >= 5) score += 15;
  if (seed.faqSchema) score += 5;
  if (seed.hero?.title) score += 10;
  if (seed.shortDescription) score += 5;
  if (seed.problems.length >= 5 && seed.solutions.length >= 5) score += 10;
  return Math.min(100, score);
}

/** Idempotent upsert of a full industry solution page by slug. */
export async function upsertIndustryPage(seed: IndustryPageSeed): Promise<Types.ObjectId> {
  const existing = await Industry.findOne({ slug: seed.slug, isDeleted: { $ne: true } })
    .select('publishedAt')
    .lean();

  const publishedAt =
    seed.publicationStatus === CmsPublicationStatus.PUBLISHED
      ? existing?.publishedAt ?? new Date()
      : null;

  const doc = await Industry.findOneAndUpdate(
    { slug: seed.slug, isDeleted: { $ne: true } },
    {
      $set: {
        name: seed.name,
        description: seed.description,
        shortDescription: seed.shortDescription,
        fullDescription: seed.fullDescription,
        icon: seed.icon,
        isActive: true,
        isFeatured: seed.isFeatured,
        displayOrder: seed.displayOrder,
        publicationStatus: seed.publicationStatus,
        publishedAt,
        hero: seed.hero,
        bannerImage: seed.bannerImage,
        gallery: seed.gallery,
        trustedBy: seed.trustedBy,
        problems: seed.problems,
        solutions: seed.solutions,
        benefits: seed.benefits,
        businessResults: seed.businessResults,
        process: seed.process,
        whyUs: seed.whyUs,
        technology: seed.technology,
        pricing: seed.pricing,
        faqs: seed.faqs,
        resources: seed.resources,
        auditCta: seed.auditCta,
        finalCta: seed.finalCta,
        testimonials: seed.testimonials,
        content: seed.content,
        metaTitle: seed.metaTitle,
        metaDescription: seed.metaDescription,
        metaKeywords: [seed.focusKeyword, ...seed.metaKeywords.filter((k) => k !== seed.focusKeyword)],
        canonicalUrl: `${SITE_URL}/industries/${seed.slug}`,
        robotsIndex: true,
        robotsFollow: true,
        includeInSitemap: true,
        ogTitle: seed.ogTitle,
        ogDescription: seed.ogDescription,
        ogImage: seed.ogImage,
        twitterTitle: seed.twitterTitle,
        twitterDescription: seed.twitterDescription,
        twitterImage: seed.twitterImage,
        faqSchema: seed.faqSchema,
        seoScore: calculateSeoScore(seed),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return doc._id;
}

/** Create specialty stub services when catalog entries are missing. */
export async function ensureIndustryStubServices(
  stubs: IndustryStubService[] = INDUSTRY_STUB_SERVICES,
): Promise<Map<string, Types.ObjectId>> {
  const ids = new Map<string, Types.ObjectId>();

  for (const stub of stubs) {
    const existing = await Service.findOne({ slug: stub.slug, isDeleted: { $ne: true } })
      .select('_id')
      .lean();

    if (existing?._id) {
      ids.set(stub.slug, existing._id);
      continue;
    }

    const doc = await Service.findOneAndUpdate(
      { slug: stub.slug, isDeleted: { $ne: true } },
      {
        $set: {
          title: stub.title,
          slug: stub.slug,
          shortDescription: stub.shortDescription,
          description: stub.description,
          kind: stub.kind === 'specialty' ? ServiceKind.SPECIALTY : ServiceKind.CATEGORY,
          categorySlug: stub.categorySlug,
          publicationStatus: CmsPublicationStatus.PUBLISHED,
          publishedAt: new Date(),
          isActive: true,
          displayOrder: 100,
          metaTitle: `${stub.title} | Growth Technos`,
          metaDescription: stub.shortDescription.slice(0, 160),
          canonicalUrl: `${SITE_URL}/services/${stub.slug}`,
          robotsIndex: true,
          robotsFollow: true,
          includeInSitemap: true,
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    ids.set(stub.slug, doc._id);
    logger.info(`Created stub service ${stub.slug}`);
  }

  return ids;
}

async function resolveServiceIds(slugs: string[]): Promise<Types.ObjectId[]> {
  if (slugs.length === 0) return [];
  const docs = await Service.find({
    slug: { $in: slugs },
    isDeleted: { $ne: true },
  })
    .select('_id slug')
    .lean();

  const bySlug = new Map(docs.map((doc) => [doc.slug, doc._id as Types.ObjectId]));
  return slugs.map((slug) => bySlug.get(slug)).filter((id): id is Types.ObjectId => Boolean(id));
}

async function resolvePortfolioIds(slugs: string[]): Promise<Types.ObjectId[]> {
  if (slugs.length === 0) return [];
  const docs = await PortfolioProject.find({
    slug: { $in: slugs },
    isDeleted: { $ne: true },
  })
    .select('_id slug')
    .lean();

  const bySlug = new Map(docs.map((doc) => [doc.slug, doc._id as Types.ObjectId]));
  return slugs.map((slug) => bySlug.get(slug)).filter((id): id is Types.ObjectId => Boolean(id));
}

async function resolveBlogIds(slugs: string[]): Promise<Types.ObjectId[]> {
  if (slugs.length === 0) return [];
  const docs = await Blog.find({
    slug: { $in: slugs },
    isDeleted: { $ne: true },
  })
    .select('_id slug')
    .lean();

  const bySlug = new Map(docs.map((doc) => [doc.slug, doc._id as Types.ObjectId]));
  return slugs.map((slug) => bySlug.get(slug)).filter((id): id is Types.ObjectId => Boolean(id));
}

export async function linkIndustryPageRelationships(
  industryIds: Map<string, Types.ObjectId>,
): Promise<void> {
  for (const [slug, industryId] of industryIds) {
    const serviceSlugs = INDUSTRY_PAGE_SERVICE_LINKS[slug] ?? [];
    const portfolioSlugs = INDUSTRY_PAGE_PORTFOLIO_LINKS[slug] ?? [];
    const blogSlugs = INDUSTRY_PAGE_BLOG_LINKS[slug] ?? [];

    const [relatedServices, relatedPortfolio, relatedBlogs] = await Promise.all([
      resolveServiceIds(serviceSlugs),
      resolvePortfolioIds(portfolioSlugs),
      resolveBlogIds(blogSlugs),
    ]);

    await Industry.updateOne(
      { _id: industryId },
      {
        $set: {
          relatedServices,
          relatedPortfolio,
          relatedBlogs,
        },
      },
    );

    for (const serviceId of relatedServices) {
      await Service.updateOne({ _id: serviceId }, { $addToSet: { industries: industryId } });
      await Service.updateOne(
        {
          _id: serviceId,
          $or: [{ primaryIndustry: null }, { primaryIndustry: { $exists: false } }],
        },
        { $set: { primaryIndustry: industryId } },
      );
    }

    for (const portfolioId of relatedPortfolio) {
      await PortfolioProject.updateOne(
        { _id: portfolioId },
        { $addToSet: { industries: industryId } },
      );
      await PortfolioProject.updateOne(
        {
          _id: portfolioId,
          $or: [{ primaryIndustry: null }, { primaryIndustry: { $exists: false } }],
        },
        { $set: { primaryIndustry: industryId } },
      );
    }

    for (const blogId of relatedBlogs) {
      await Blog.updateOne({ _id: blogId }, { $set: { industry: industryId } });
    }

    logger.info(`Linked industry hub relations for ${slug}`, {
      services: relatedServices.length,
      portfolio: relatedPortfolio.length,
      blogs: relatedBlogs.length,
      missingServices: serviceSlugs.length - relatedServices.length,
      missingPortfolio: portfolioSlugs.length - relatedPortfolio.length,
      missingBlogs: blogSlugs.length - relatedBlogs.length,
    });
  }
}

export async function seedIndustryPages(): Promise<Map<string, Types.ObjectId>> {
  const ids = new Map<string, Types.ObjectId>();

  for (const page of INDUSTRY_PAGES) {
    const id = await upsertIndustryPage(page);
    ids.set(page.slug, id);
    logger.info(`Upserted industry page: ${page.slug}`);
  }

  return ids;
}

export async function runIndustryPagesSeed(): Promise<{
  industries: number;
  stubServices: number;
}> {
  const stubIds = await ensureIndustryStubServices();
  const industryIds = await seedIndustryPages();
  await linkIndustryPageRelationships(industryIds);

  return {
    industries: industryIds.size,
    stubServices: stubIds.size,
  };
}
