/**
 * Idempotent sync: case studies in MongoDB  <=  frontend data files.
 *
 * Sources (in the frontend repo):
 *   src/data/projects-data.json       case study content (also the site's offline fallback)
 *   src/data/portfolio-projects.json  project registry from the portfolio PDF (live URL, featured…)
 *   src/data/project-screenshots.json screenshots captured by `npm run screenshots`
 *
 * Usage:
 *   npm run sync:case-studies -- --dry-run                    # print changes, write nothing
 *   npm run sync:case-studies                                 # apply (local DB only)
 *   npm run sync:case-studies -- --confirm-production         # required for a non-local MONGODB_URI
 *
 * Options:
 *   --frontend <path>  frontend repo root (default: FRONTEND_ROOT env or ../growth-technos-smart)
 *
 * Behaviour:
 *   - matches on slug, so running it twice changes nothing the second time;
 *   - creates missing case studies as PUBLISHED, keeps the publication status of existing ones;
 *   - removes unverified testimonials, budgets, stock/hotlinked images and wrong live links;
 *   - sets canonical URLs to https://www.growthtechnos.com/projects/<slug>.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { CmsPublicationStatus, PortfolioProjectType } from '@core/constants/cms';
import { PortfolioProject } from '@modules/portfolio/model/portfolio.model';

const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL ?? 'https://www.growthtechnos.com').replace(
  /\/$/,
  '',
);
const PLACEHOLDER_IMAGE = '/projects/placeholder.svg';

type CaseStudyRecord = {
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
  features?: string[];
  technologies?: Array<{ name: string; logo?: string }>;
  solutions?: string[];
  achievements?: string[];
  challenges?: string[];
  featured?: boolean;
};

type RegistryEntry = {
  slug: string;
  liveUrl: string | null;
  featured: boolean;
  caseStudySlug: string | null;
};

type Screenshots = Record<string, { desktop?: string; mobile?: string }>;

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readJson<T>(file: string, fallback?: T): T {
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing file: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
}

function resolveFrontendRoot(): string {
  const explicit = arg('--frontend') ?? process.env.FRONTEND_ROOT;
  if (explicit) return path.resolve(explicit);
  return path.resolve(__dirname, '../../../growth-technos-smart');
}

function isLocalMongo(uri: string): boolean {
  return /mongodb(\+srv)?:\/\/([^@/]*@)?(localhost|127\.0\.0\.1|mongodb|\[::1\])(:\d+)?\//i.test(
    uri,
  );
}

function redactUri(uri: string): string {
  return uri.replace(/\/\/([^@/]*)@/, '//***@');
}

function buildPayload(
  record: CaseStudyRecord,
  registry: RegistryEntry | undefined,
  screenshots: Screenshots,
): Record<string, unknown> {
  const shots = registry ? (screenshots[registry.slug] ?? {}) : {};
  const images = [shots.desktop, shots.mobile].filter((src): src is string => Boolean(src));
  const mainImage = images[0] ?? PLACEHOLDER_IMAGE;
  const canonical = `${PUBLIC_SITE_URL}/projects/${record.slug}`;
  const liveUrl = registry ? registry.liveUrl : null;

  return {
    slug: record.slug,
    legacyId: record.id,
    title: record.title,
    clientName: record.client,
    category: record.category,
    shortDescription: record.description,
    fullDescription: record.fullDescription ?? record.description,
    challenge: (record.challenges ?? []).join('\n\n'),
    solution: (record.solutions ?? []).join('\n\n'),
    technologyStack: (record.technologies ?? []).map((tech) => ({
      name: tech.name,
      ...(tech.logo ? { logo: tech.logo } : {}),
    })),
    projectDuration: record.duration ?? '',
    completionDate: record.completionDate ?? '',
    teamSize: record.team ?? '',
    budget: '',
    features: record.features ?? [],
    businessResults: record.achievements ?? [],
    statistics: [],
    testimonial: null,
    featuredImage: { url: mainImage, alt: `${record.title} screenshot` },
    bannerImage: { url: mainImage, alt: `${record.title} screenshot` },
    gallery: images.map((url, index) => ({
      url,
      alt: `${record.title} ${index === 0 ? 'desktop' : 'mobile'} screenshot`,
      order: index,
    })),
    links: liveUrl ? { websiteUrl: liveUrl } : {},
    projectType: PortfolioProjectType.CASE_STUDY,
    isFeatured: registry?.featured ?? record.featured ?? false,
    metaTitle: `${record.title} Case Study`,
    metaDescription: record.description.slice(0, 160),
    canonicalUrl: canonical,
    canonical,
  };
}

function diffKeys(existing: Record<string, unknown> | null, payload: Record<string, unknown>) {
  if (!existing) return Object.keys(payload);
  return Object.keys(payload).filter(
    (key) => JSON.stringify(existing[key] ?? null) !== JSON.stringify(payload[key] ?? null),
  );
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const confirmProduction = process.argv.includes('--confirm-production');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  if (!dryRun && !isLocalMongo(uri) && !confirmProduction) {
    console.error(
      `Refusing to write to a non-local database (${redactUri(uri)}).\n` +
        'Run with --dry-run first, take a mongodump backup, then re-run with --confirm-production.',
    );
    process.exitCode = 1;
    return;
  }

  const root = resolveFrontendRoot();
  const records = readJson<CaseStudyRecord[]>(path.join(root, 'src/data/projects-data.json'));
  const registryList = readJson<RegistryEntry[]>(
    path.join(root, 'src/data/portfolio-projects.json'),
  );
  const screenshots = readJson<Screenshots>(
    path.join(root, 'src/data/project-screenshots.json'),
    {},
  );
  const registryByCase = new Map(
    registryList.filter((entry) => entry.caseStudySlug).map((e) => [e.caseStudySlug, e]),
  );

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Database: ${redactUri(uri)}`);
  console.log(`Frontend: ${root}`);
  console.log(`Case studies in data file: ${records.length}\n`);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let displayOrder = 0;

  for (const record of records) {
    displayOrder += 1;
    const registry = registryByCase.get(record.slug);
    const payload = buildPayload(record, registry, screenshots);
    const existing = await PortfolioProject.findOne({
      slug: record.slug,
      isDeleted: { $ne: true },
    }).lean<Record<string, unknown> | null>();
    const changed = diffKeys(existing, payload);

    if (!existing) {
      created += 1;
      console.log(`+ CREATE ${record.slug}`);
    } else if (changed.length > 0) {
      updated += 1;
      console.log(`~ UPDATE ${record.slug}: ${changed.join(', ')}`);
    } else {
      unchanged += 1;
      console.log(`= OK     ${record.slug}`);
      continue;
    }

    if (dryRun) continue;

    await PortfolioProject.updateOne(
      { slug: record.slug, isDeleted: { $ne: true } },
      {
        $set: payload,
        $setOnInsert: {
          publicationStatus: CmsPublicationStatus.PUBLISHED,
          publishedAt: new Date(),
          displayOrder,
          robotsIndex: true,
          robotsFollow: true,
          indexable: true,
          includeInSitemap: true,
          content: {
            format: 'html',
            html: `<p>${record.fullDescription ?? record.description}</p>`,
            plainText: record.fullDescription ?? record.description,
          },
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  console.log(
    `\n${dryRun ? '[DRY RUN] would have ' : ''}created ${created}, updated ${updated}, unchanged ${unchanged}`,
  );
}

main()
  .catch((error) => {
    console.error('Case study sync failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
