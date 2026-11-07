/**
 * One-off cleanup: replace saved canonical / og:url values that point at the wrong
 * host (e.g. http://localhost:5000/portfolio/...) or the wrong path.
 *
 *   npm run fix:canonicals -- --dry-run                 # print what would change (safe)
 *   npm run fix:canonicals                              # apply on a LOCAL database
 *   npm run fix:canonicals -- --confirm-production      # required for a non-local MONGODB_URI
 *
 * Every value is rewritten to https://www.growthtechnos.com/<section>/<slug>.
 * It never runs automatically (not wired into start/build/seed).
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL ?? 'https://www.growthtechnos.com').replace(
  /\/$/,
  '',
);

/** collection name -> public path prefix */
const TARGETS: Array<{ collection: string; prefix: string }> = [
  { collection: 'portfolioprojects', prefix: '/projects' },
  { collection: 'blogs', prefix: '/blog' },
  { collection: 'services', prefix: '/services' },
  { collection: 'industries', prefix: '/industries' },
];

const FIELDS = ['canonicalUrl', 'canonical', 'openGraph.url'] as const;

function isLocalMongo(uri: string): boolean {
  return /mongodb(\+srv)?:\/\/([^@/]*@)?(localhost|127\.0\.0\.1|mongodb|\[::1\])(:\d+)?\//i.test(
    uri,
  );
}

function redactUri(uri: string): string {
  return uri.replace(/\/\/([^@/]*)@/, '//***@');
}

function getPath(doc: Record<string, unknown>, field: string): unknown {
  return field.split('.').reduce<unknown>((value, key) => {
    if (value && typeof value === 'object') return (value as Record<string, unknown>)[key];
    return undefined;
  }, doc);
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

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Database: ${redactUri(uri)}`);
  console.log(`Target base URL: ${PUBLIC_SITE_URL}\n`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database handle');

  let total = 0;

  for (const target of TARGETS) {
    const collection = db.collection(target.collection);
    const cursor = collection.find(
      { slug: { $exists: true } },
      { projection: { slug: 1, canonicalUrl: 1, canonical: 1, 'openGraph.url': 1 } },
    );

    for await (const doc of cursor) {
      const slug = String(doc.slug ?? '').trim();
      if (!slug) continue;
      const expected = `${PUBLIC_SITE_URL}${target.prefix}/${slug}`;
      const set: Record<string, string> = {};

      for (const field of FIELDS) {
        const current = getPath(doc as Record<string, unknown>, field);
        if (typeof current !== 'string' || !current.trim()) continue;
        if (current.trim() !== expected) set[field] = expected;
      }

      if (Object.keys(set).length === 0) continue;
      total += 1;
      for (const [field, value] of Object.entries(set)) {
        console.log(
          `${target.collection} ${slug}  ${field}: ${String(getPath(doc as Record<string, unknown>, field))}  ->  ${value}`,
        );
      }
      if (!dryRun) await collection.updateOne({ _id: doc._id }, { $set: set });
    }
  }

  console.log(`\n${dryRun ? '[DRY RUN] would update' : 'Updated'} ${total} document(s).`);
}

main()
  .catch((error) => {
    console.error('Canonical cleanup failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
