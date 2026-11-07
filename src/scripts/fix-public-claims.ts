/**
 * One-off cleanup of unverified claims stored in MongoDB content that the public site shows
 * (FAQs, thank-you pages, form success messages, lead forms, offers, popups, CTAs).
 *
 *   npm run fix:claims -- --dry-run                 # print what would change (safe)
 *   npm run fix:claims                              # apply on a LOCAL database
 *   npm run fix:claims -- --confirm-production      # required for a non-local MONGODB_URI
 *
 * Only exact phrases listed below are replaced. Anything else (e.g. long marketing copy that
 * mentions an old claim in a new way) is printed as a WARNING for manual editing in /admin.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const COLLECTIONS = [
  'faqs',
  'thankyoupages',
  'successmessages',
  'leadforms',
  'offers',
  'popupcampaigns',
  'stickyctacampaigns',
  'floatingctas',
  'whatsappwidgets',
  'contactwidgets',
  'leadmagnets',
];

/** [find, replace] — applied in order to every string field. */
const REPLACEMENTS: Array<[string, string]> = [
  [
    'Growth Technos is based in Noida Sector 62, Uttar Pradesh, India, and serves clients across Delhi NCR, India, and 12+ countries through on-site and remote collaboration.',
    'Growth Technos is registered in Saharanpur, Uttar Pradesh, and meets clients in Noida by appointment. We serve Noida, Delhi NCR, Saharanpur and clients in 5 countries, mostly through remote collaboration.',
  ],
  [
    'Growth Technos is a full-service digital agency in Noida Sector 62.',
    'Growth Technos is a software and web development company serving Noida, Delhi NCR & Saharanpur.',
  ],
  [
    'Expect a reply within 30 minutes during business hours (Mon–Sat).',
    'We reply within one business day (Mon–Fri 9am–5pm, Sat 10am–4pm).',
  ],
  [
    'Usually responds within 30 minutes during business hours.',
    'We reply within one business day.',
  ],
  ['Usually replies within 30 minutes during business hours.', 'We reply within one business day.'],
  ['usually within 30 minutes during business hours', 'within one business day'],
  ['Usually replies within 30 minutes', 'We reply within one business day'],
  ['Typically replies within an hour', 'We reply within one business day'],
  ['100+ clients across 12+ countries', '20+ clients in 5 countries'],
  ['100+ businesses across 12+ countries', '20+ clients in 5 countries'],
];

/** Phrases that need a human decision if they remain after replacement. */
const WARN_PATTERNS = [
  /Sector 62/i,
  /\b100\+/,
  /\b12\+ countries/i,
  /24\/7/,
  /98%/,
  /award/i,
  /most trusted/i,
  /30 minutes/i,
];

function isLocalMongo(uri: string): boolean {
  return /mongodb(\+srv)?:\/\/([^@/]*@)?(localhost|127\.0\.0\.1|mongodb|\[::1\])(:\d+)?\//i.test(
    uri,
  );
}

function redactUri(uri: string): string {
  return uri.replace(/\/\/([^@/]*)@/, '//***@');
}

type Change = { path: string; before: string; after: string };

/** Walks a document and returns a new copy with replacements, collecting changes and warnings. */
function walk(
  value: unknown,
  path: string,
  changes: Change[],
  warnings: Array<{ path: string; text: string }>,
): unknown {
  if (typeof value === 'string') {
    let next = value;
    for (const [find, replace] of REPLACEMENTS) next = next.split(find).join(replace);
    if (next !== value) changes.push({ path, before: value, after: next });
    if (WARN_PATTERNS.some((re) => re.test(next))) warnings.push({ path, text: next });
    return next;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => walk(item, `${path}.${index}`, changes, warnings));
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    if ((value as { _bsontype?: string })._bsontype) return value; // ObjectId etc.
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] =
        key === '_id' ? child : walk(child, path ? `${path}.${key}` : key, changes, warnings);
    }
    return out;
  }
  return value;
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

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Database: ${redactUri(uri)}\n`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database handle');

  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
  let updatedDocs = 0;
  let warningCount = 0;

  for (const name of COLLECTIONS) {
    if (!existing.has(name)) continue;
    const collection = db.collection(name);

    for await (const doc of collection.find({})) {
      const changes: Change[] = [];
      const warnings: Array<{ path: string; text: string }> = [];
      const next = walk(doc, '', changes, warnings) as Record<string, unknown>;

      for (const warning of warnings) {
        warningCount += 1;
        console.log(
          `WARNING ${name} ${String(doc._id)} ${warning.path}: ${warning.text.slice(0, 160)}`,
        );
      }
      if (changes.length === 0) continue;

      updatedDocs += 1;
      for (const change of changes) {
        console.log(
          `${name} ${String(doc._id)} ${change.path}\n  - ${change.before.slice(0, 200)}\n  + ${change.after.slice(0, 200)}`,
        );
      }
      if (!dryRun) {
        const set: Record<string, unknown> = {};
        for (const change of changes) {
          const topKey = change.path.split('.')[0];
          set[topKey] = next[topKey];
        }
        await collection.updateOne({ _id: doc._id }, { $set: set });
      }
    }
  }

  console.log(
    `\n${dryRun ? '[DRY RUN] would update' : 'Updated'} ${updatedDocs} document(s). ${warningCount} warning(s) need manual review in /admin.`,
  );
}

main()
  .catch((error) => {
    console.error('Claims cleanup failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
