import fs from 'fs';
import path from 'path';
import { Types } from 'mongoose';
import { CmsPublicationStatus, PortfolioProjectType, ServiceKind } from '@core/constants/cms';
import { Industry } from '@modules/industries/model/industry.model';
import { PortfolioProject } from '@modules/portfolio/model/portfolio.model';
import { Service } from '@modules/services/model/service.model';
import {
  CMS_INDUSTRIES,
  FEATURED_PROJECT_SLUGS,
  HOMEPAGE_SERVICE_CATEGORY_SLUGS,
  PORTFOLIO_SHOWCASE_ITEMS,
} from './cms-industries.data';

export const SITE_URL = (process.env.APP_URL ?? 'https://growthtechnos.com').replace(/\/$/, '');

type RawSubService = {
  title: string;
  description: string;
  keyBenefits?: string[];
  pricing?: {
    starting?: string;
    timeline?: string;
    included?: string[];
  };
};

type RawServiceCategory = {
  title: string;
  subtitle?: string;
  description: string;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
  heroImage?: string;
  keyBenefits?: string[];
  features?: Array<{
    title: string;
    description: string;
    iconImage?: string;
  }>;
  technologies?: Array<{ name: string; level?: number }>;
  faqs?: Array<{ question: string; answer: string }>;
  pricing?: {
    starting?: string;
    timeline?: string;
    included?: string[];
  };
  subServices?: Record<string, RawSubService>;
};

type ProjectRecord = {
  id: string;
  slug: string;
  title: string;
  category: string;
  client: string;
  description: string;
  fullDescription?: string;
  duration?: string;
  completionDate?: string;
  team?: string;
  budget?: string;
  image: string;
  gallery?: string[];
  liveUrl?: string;
  features?: string[];
  technologies?: Array<{ name: string; logo?: string }>;
  solutions?: string[];
  achievements?: string[];
  challenges?: string[];
  testimonial?: {
    author: string;
    position?: string;
    text: string;
    avatar?: string;
  };
};

function frontendRoot(): string {
  return path.resolve(__dirname, '../../../../frontend');
}

export function loadServicesCatalogFromFrontend(): Record<string, RawServiceCategory> {
  const filePath = path.join(frontendRoot(), 'src/data/services-data.ts');
  const source = fs.readFileSync(filePath, 'utf-8');
  const match = source.match(/export const servicesCatalogData = (\{[\s\S]*\});/);

  if (!match?.[1]) {
    throw new Error(`Unable to parse services catalog from ${filePath}`);
  }

  return new Function(`return ${match[1]}`)() as Record<string, RawServiceCategory>;
}

export function loadProjectsFromFrontend(): ProjectRecord[] {
  const filePath = path.join(frontendRoot(), 'src/data/projects-data.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as ProjectRecord[];
}

function encodeServiceSlug(categorySlug: string, subSlug?: string): string {
  return subSlug ? `${categorySlug}--${subSlug}` : categorySlug;
}

function serviceCanonical(slug: string): string {
  return `${SITE_URL}/services/${slug}`;
}

function portfolioCanonical(slug: string): string {
  return `${SITE_URL}/portfolio/${slug}`;
}

function toImageAsset(url?: string, alt?: string) {
  if (!url) return undefined;
  return { url, alt: alt ?? '' };
}

export async function upsertCmsIndustry(seed: {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
}): Promise<Types.ObjectId> {
  const metaDescription =
    seed.description?.slice(0, 160) ??
    `Services, case studies, and insights for ${seed.name.toLowerCase()} businesses.`;

  const doc = await Industry.findOneAndUpdate(
    { slug: seed.slug, isDeleted: { $ne: true } },
    {
      $set: {
        name: seed.name,
        description: seed.description,
        icon: seed.icon,
        isActive: true,
        metaTitle: `${seed.name} Industry Hub | Growth Technos`,
        metaDescription,
        canonicalUrl: `${SITE_URL}/industries/${seed.slug}`,
        robotsIndex: true,
        robotsFollow: true,
        includeInSitemap: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc._id;
}

export async function upsertService(
  payload: Record<string, unknown>,
): Promise<Types.ObjectId> {
  const slug = String(payload.slug);
  const doc = await Service.findOneAndUpdate(
    { slug, isDeleted: { $ne: true } },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc._id;
}

export async function upsertPortfolioProject(
  payload: Record<string, unknown>,
): Promise<Types.ObjectId> {
  const slug = String(payload.slug);
  const doc = await PortfolioProject.findOneAndUpdate(
    { slug, isDeleted: { $ne: true } },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc._id;
}

export async function seedCmsIndustries(): Promise<Map<string, Types.ObjectId>> {
  const ids = new Map<string, Types.ObjectId>();
  for (const industry of CMS_INDUSTRIES) {
    ids.set(industry.slug, await upsertCmsIndustry(industry));
  }
  return ids;
}

export async function seedServicesCatalog(): Promise<Map<string, Types.ObjectId>> {
  const catalog = loadServicesCatalogFromFrontend();
  const ids = new Map<string, Types.ObjectId>();
  let displayOrder = 0;

  for (const [categorySlug, raw] of Object.entries(catalog)) {
    displayOrder += 1;
    const categoryId = await upsertService({
      slug: categorySlug,
      title: raw.title,
      shortDescription: raw.subtitle ?? raw.description.slice(0, 500),
      fullDescription: raw.description,
      heroTitle: raw.title,
      heroSubtitle: raw.subtitle,
      heroImage: toImageAsset(raw.heroImage, raw.title),
      bannerImage: toImageAsset(raw.heroImage, raw.title),
      icon: raw.icon,
      iconBg: raw.iconBg,
      iconColor: raw.iconColor,
      kind: ServiceKind.CATEGORY,
      categorySlug,
      categoryTitle: raw.title,
      benefits: raw.keyBenefits ?? [],
      features: (raw.features ?? []).map((feature) => ({
        title: feature.title,
        description: feature.description,
        iconImage: feature.iconImage,
      })),
      technologyStack: raw.technologies ?? [],
      faqs: raw.faqs ?? [],
      pricing: raw.pricing
        ? {
            starting: raw.pricing.starting,
            timeline: raw.pricing.timeline,
            included: raw.pricing.included ?? [],
          }
        : undefined,
      deliverables: raw.pricing?.included ?? [],
      timeline: raw.pricing?.timeline,
      publicationStatus: CmsPublicationStatus.PUBLISHED,
      publishedAt: new Date(),
      isFeatured: HOMEPAGE_SERVICE_CATEGORY_SLUGS.includes(
        categorySlug as (typeof HOMEPAGE_SERVICE_CATEGORY_SLUGS)[number],
      ),
      isPinned: false,
      displayOrder,
      metaTitle: `${raw.title} | Growth Technos`,
      metaDescription: raw.description.slice(0, 160),
      canonicalUrl: serviceCanonical(categorySlug),
      canonical: serviceCanonical(categorySlug),
      indexable: true,
      robotsIndex: true,
      robotsFollow: true,
      includeInSitemap: true,
      faqSchema: raw.faqs ?? [],
      content: {
        format: 'html',
        html: `<p>${raw.description}</p>`,
        plainText: raw.description,
      },
    });
    ids.set(categorySlug, categoryId);

    const subServices = raw.subServices ?? {};
    let subOrder = 0;
    for (const [subSlug, subRaw] of Object.entries(subServices)) {
      subOrder += 1;
      const slug = encodeServiceSlug(categorySlug, subSlug);
      const subId = await upsertService({
        slug,
        title: subRaw.title,
        shortDescription: subRaw.description.slice(0, 500),
        fullDescription: subRaw.description,
        heroTitle: subRaw.title,
        heroSubtitle: raw.subtitle,
        heroImage: toImageAsset(raw.heroImage, subRaw.title),
        icon: raw.icon,
        iconBg: raw.iconBg,
        iconColor: raw.iconColor,
        kind: ServiceKind.SPECIALTY,
        categorySlug,
        categoryTitle: raw.title,
        parentService: categoryId,
        benefits: subRaw.keyBenefits ?? [],
        features: (raw.features ?? []).map((feature) => ({
          title: feature.title,
          description: feature.description,
          iconImage: feature.iconImage,
        })),
        technologyStack: raw.technologies ?? [],
        faqs: raw.faqs ?? [],
        pricing: subRaw.pricing
          ? {
              starting: subRaw.pricing.starting,
              timeline: subRaw.pricing.timeline,
              included: subRaw.pricing.included ?? [],
            }
          : raw.pricing,
        deliverables: subRaw.pricing?.included ?? raw.pricing?.included ?? [],
        timeline: subRaw.pricing?.timeline ?? raw.pricing?.timeline,
        publicationStatus: CmsPublicationStatus.PUBLISHED,
        publishedAt: new Date(),
        isFeatured: false,
        isPinned: false,
        displayOrder: subOrder,
        metaTitle: `${subRaw.title} | Growth Technos`,
        metaDescription: subRaw.description.slice(0, 160),
        canonicalUrl: serviceCanonical(slug),
        canonical: serviceCanonical(slug),
        indexable: true,
        robotsIndex: true,
        robotsFollow: true,
        includeInSitemap: true,
        faqSchema: raw.faqs ?? [],
        content: {
          format: 'html',
          html: `<p>${subRaw.description}</p>`,
          plainText: subRaw.description,
        },
      });
      ids.set(slug, subId);
    }
  }

  return ids;
}

export async function seedPortfolioShowcase(): Promise<Map<string, Types.ObjectId>> {
  const ids = new Map<string, Types.ObjectId>();
  let displayOrder = 0;

  for (const item of PORTFOLIO_SHOWCASE_ITEMS) {
    displayOrder += 1;
    const id = await upsertPortfolioProject({
      slug: item.slug,
      title: item.title,
      shortDescription: item.shortDescription,
      fullDescription: item.shortDescription,
      projectType: PortfolioProjectType.SHOWCASE,
      featuredImage: toImageAsset(item.image, item.title),
      bannerImage: toImageAsset(item.image, item.title),
      links: { websiteUrl: item.websiteUrl },
      gallery: [{ url: item.image, alt: item.title, order: 0 }],
      publicationStatus: CmsPublicationStatus.PUBLISHED,
      publishedAt: new Date(),
      isFeatured: true,
      isPinned: false,
      displayOrder,
      metaTitle: `${item.title} Portfolio | Growth Technos`,
      metaDescription: item.shortDescription,
      canonicalUrl: portfolioCanonical(item.slug),
      canonical: portfolioCanonical(item.slug),
      indexable: true,
      robotsIndex: true,
      robotsFollow: true,
      includeInSitemap: true,
      content: {
        format: 'html',
        html: `<p>${item.shortDescription}</p>`,
        plainText: item.shortDescription,
      },
    });
    ids.set(item.slug, id);
  }

  return ids;
}

export async function seedCaseStudyProjects(): Promise<Map<string, Types.ObjectId>> {
  const projects = loadProjectsFromFrontend();
  const ids = new Map<string, Types.ObjectId>();
  let displayOrder = 0;

  for (const project of projects) {
    displayOrder += 1;
    const isFeatured = FEATURED_PROJECT_SLUGS.includes(
      project.slug as (typeof FEATURED_PROJECT_SLUGS)[number],
    );

    const id = await upsertPortfolioProject({
      slug: project.slug,
      legacyId: project.id,
      title: project.title,
      clientName: project.client,
      category: project.category,
      shortDescription: project.description,
      fullDescription: project.fullDescription ?? project.description,
      challenge: (project.challenges ?? []).join('\n\n'),
      solution: (project.solutions ?? []).join('\n\n'),
      process: (project.solutions ?? []).map((step, index) => ({
        title: `Step ${index + 1}`,
        description: step,
        order: index + 1,
      })),
      technologyStack: (project.technologies ?? []).map((tech) => ({
        name: tech.name,
        logo: tech.logo,
      })),
      projectDuration: project.duration,
      completionDate: project.completionDate,
      teamSize: project.team,
      budget: project.budget,
      features: project.features ?? [],
      businessResults: project.achievements ?? [],
      statistics: (project.achievements ?? []).slice(0, 4).map((value) => ({
        label: 'Result',
        value,
      })),
      testimonial: project.testimonial
        ? {
            author: project.testimonial.author,
            position: project.testimonial.position,
            text: project.testimonial.text,
            avatar: project.testimonial.avatar,
          }
        : undefined,
      featuredImage: toImageAsset(project.image, project.title),
      bannerImage: toImageAsset(project.image, project.title),
      gallery: (project.gallery ?? [project.image]).map((url, index) => ({
        url,
        alt: project.title,
        order: index,
      })),
      links: { websiteUrl: project.liveUrl },
      projectType: PortfolioProjectType.CASE_STUDY,
      publicationStatus: CmsPublicationStatus.PUBLISHED,
      publishedAt: new Date(),
      isFeatured,
      isPinned: isFeatured,
      displayOrder,
      metaTitle: `${project.title} Case Study | Growth Technos`,
      metaDescription: project.description.slice(0, 160),
      canonicalUrl: portfolioCanonical(project.slug),
      canonical: portfolioCanonical(project.slug),
      indexable: true,
      robotsIndex: true,
      robotsFollow: true,
      includeInSitemap: true,
      content: {
        format: 'html',
        html: `<p>${project.fullDescription ?? project.description}</p>`,
        plainText: project.fullDescription ?? project.description,
      },
    });
    ids.set(project.slug, id);
  }

  return ids;
}

export async function seedCmsRelationships(
  serviceIds: Map<string, Types.ObjectId>,
  caseStudyIds: Map<string, Types.ObjectId>,
): Promise<void> {
  const services = await Service.find({
    _id: { $in: Array.from(serviceIds.values()) },
    isDeleted: { $ne: true },
  }).select('_id slug categorySlug kind');

  const byCategory = new Map<string, typeof services>();
  for (const service of services) {
    const key = service.categorySlug ?? service.slug;
    const group = byCategory.get(key) ?? [];
    group.push(service);
    byCategory.set(key, group);
  }

  for (const service of services) {
    const key = service.categorySlug ?? service.slug;
    const group = byCategory.get(key) ?? [];
    const relatedServices = group
      .filter((item) => !item._id.equals(service._id))
      .slice(0, 4)
      .map((item) => item._id);

    if (relatedServices.length > 0) {
      await Service.updateOne({ _id: service._id }, { $set: { relatedServices } });
    }
  }

  const caseStudySlugs = Array.from(caseStudyIds.keys());
  for (const [slug, id] of caseStudyIds) {
    const relatedPortfolio = caseStudySlugs
      .filter((item) => item !== slug)
      .slice(0, 3)
      .map((item) => caseStudyIds.get(item)!);

    await PortfolioProject.updateOne({ _id: id }, { $set: { relatedPortfolio } });
  }
}
