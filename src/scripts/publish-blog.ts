import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '@core/database/connection';
import {
  BlogDifficultyLevel,
  BlogPublicationStatus,
} from '@core/constants';
import {
  upsertAuthor,
  upsertCategory,
  upsertTag,
  upsertIndustry,
  upsertTopicCluster,
  upsertBlog,
  BlogPostSeed,
} from './seed-data/blog-seeder.helpers';
import {
  BLOG_AUTHOR,
  BLOG_CATEGORIES,
  BLOG_INDUSTRIES,
  BLOG_TAGS,
  BLOG_TOPIC_CLUSTERS,
} from './seed-data/blog-taxonomy.data';
import type { ITableOfContentsItem } from '@core/schemas/blog-seo.schema';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function parseFrontmatter(content: string): { metadata: Record<string, any>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { metadata: {}, body: content };
  }

  const yamlBlock = match[1];
  const body = match[2];
  const metadata: Record<string, any> = {};

  yamlBlock.split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (value.startsWith('[') && value.endsWith(']')) {
      metadata[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else if (value === 'true') {
      metadata[key] = true;
    } else if (value === 'false') {
      metadata[key] = false;
    } else {
      metadata[key] = value;
    }
  });

  return { metadata, body };
}

function markdownToHtml(md: string): {
  html: string;
  tableOfContents: ITableOfContentsItem[];
  faqSchema: Array<{ question: string; answer: string }>;
} {
  const lines = md.split(/\r?\n/);
  const htmlParts: string[] = [];
  const tableOfContents: ITableOfContentsItem[] = [];
  const faqSchema: Array<{ question: string; answer: string }> = [];

  let inList: 'ul' | 'ol' | null = null;
  let inFaq = false;
  let currentFaqQuestion = '';
  let currentFaqAnswer = '';

  const CTA_BLOCK = `
<div class="blog-cta" style="margin:2rem 0;padding:1.75rem;border-radius:12px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#f8fafc;">
  <p style="margin:0 0 0.5rem;font-size:0.875rem;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">Work with Growth Technos</p>
  <h3 style="margin:0 0 0.75rem;font-size:1.35rem;color:#fff;">Ready to turn this strategy into measurable growth?</h3>
  <p style="margin:0 0 1rem;line-height:1.6;">Our team designs websites, SEO programs, and automation systems for businesses that want professional results—not generic templates.</p>
  <p style="margin:0;"><a href="/contact" style="display:inline-block;padding:0.75rem 1.25rem;border-radius:8px;background:#22c55e;color:#052e16;font-weight:600;text-decoration:none;">Book a free strategy call</a></p>
</div>`;

  function flushList() {
    if (inList) {
      htmlParts.push(`</${inList}>`);
      inList = null;
    }
  }

  function flushFaq() {
    if (currentFaqQuestion && currentFaqAnswer) {
      faqSchema.push({
        question: currentFaqQuestion.trim(),
        answer: currentFaqAnswer.trim(),
      });
      currentFaqQuestion = '';
      currentFaqAnswer = '';
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      flushList();
      continue;
    }

    if (/^###?\s+FAQ/i.test(line)) {
      flushList();
      flushFaq();
      inFaq = true;
      htmlParts.push('<h2 id="faqs">Frequently Asked Questions</h2>');
      tableOfContents.push({ id: 'faqs', text: 'Frequently Asked Questions', level: 2 });
      continue;
    }

    if (inFaq) {
      const qMatch = line.match(/^\*\*(.+?)\*\*$/) || line.match(/^###?\s+(.+)$/);
      if (qMatch) {
        flushFaq();
        currentFaqQuestion = qMatch[1];
        htmlParts.push(`<h3>${currentFaqQuestion}</h3>`);
        continue;
      } else if (currentFaqQuestion) {
        currentFaqAnswer += (currentFaqAnswer ? ' ' : '') + line;
        htmlParts.push(`<p>${line}</p>`);
        continue;
      }
    }

    if (line.startsWith('## ')) {
      flushList();
      const text = line.replace(/^##\s+/, '').trim();
      const id = slugify(text);
      htmlParts.push(`<h2 id="${id}">${text}</h2>`);
      tableOfContents.push({ id, text, level: 2 });
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      const text = line.replace(/^###\s+/, '').trim();
      const id = slugify(text);
      htmlParts.push(`<h3 id="${id}">${text}</h3>`);
      tableOfContents.push({ id, text, level: 3 });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (inList !== 'ul') {
        flushList();
        htmlParts.push('<ul>');
        inList = 'ul';
      }
      const itemText = line.replace(/^[-*]\s+/, '');
      htmlParts.push(`  <li>${formatInline(itemText)}</li>`);
      continue;
    }

    if (/^[0-9]+\.\s+/.test(line)) {
      if (inList !== 'ol') {
        flushList();
        htmlParts.push('<ol>');
        inList = 'ol';
      }
      const itemText = line.replace(/^[0-9]+\.\s+/, '');
      htmlParts.push(`  <li>${formatInline(itemText)}</li>`);
      continue;
    }

    flushList();
    htmlParts.push(`<p>${formatInline(line)}</p>`);
  }

  flushList();
  flushFaq();

  let fullHtml = htmlParts.join('\n');
  if (fullHtml.includes('<h2 id="faqs">')) {
    fullHtml = fullHtml.replace('<h2 id="faqs">', `${CTA_BLOCK}\n\n<h2 id="faqs">`);
  }
  fullHtml += `\n\n${CTA_BLOCK}`;

  return { html: fullHtml.trim(), tableOfContents, faqSchema };
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

export async function publishBlogFromMarkdown(
  filePath: string,
  taxonomies: {
    authorId: Types.ObjectId;
    categoryIds: Map<string, Types.ObjectId>;
    tagIds: Map<string, Types.ObjectId>;
    industryIds: Map<string, Types.ObjectId>;
    topicClusterIds: Map<string, Types.ObjectId>;
  },
): Promise<void> {
  console.log(`\n========================================`);
  console.log(`Publishing blog from: ${path.basename(filePath)}`);
  console.log(`========================================`);

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { metadata, body } = parseFrontmatter(fileContent);

  if (!metadata.title || !metadata.slug) {
    throw new Error('Frontmatter must include "title" and "slug".');
  }

  const { html, tableOfContents, faqSchema } = markdownToHtml(body);

  const excerpt = metadata.metaDescription || metadata.excerpt || body.slice(0, 160).replace(/[#*_-]/g, '').trim();
  const summary = metadata.summary || excerpt;
  const isScheduled = Boolean(metadata.scheduledPublishAt);
  const scheduledPublishAt = isScheduled ? new Date(metadata.scheduledPublishAt) : undefined;
  const publicationStatus = isScheduled ? BlogPublicationStatus.SCHEDULED : BlogPublicationStatus.PUBLISHED;
  const publishedAt = scheduledPublishAt || new Date();

  const blogSeed: BlogPostSeed = {
    slug: metadata.slug,
    title: metadata.title,
    excerpt,
    summary,
    metaTitle: metadata.metaTitle || metadata.title,
    metaDescription: metadata.metaDescription || excerpt,
    metaKeywords: metadata.metaKeywords || [],
    featuredImageFile: metadata.featuredImage || `${metadata.slug}-featured.webp`,
    bannerImageFile: metadata.bannerImage || `${metadata.slug}-banner.webp`,
    thumbnailFile: metadata.thumbnail || `${metadata.slug}-featured.webp`,
    categorySlug: metadata.category || 'ai-automation',
    tagSlugs: metadata.tags || ['custom-software'],
    topicClusterSlug: metadata.topicCluster || 'custom-software-engineering',
    industrySlug: metadata.industry || 'general',
    authorSlug: metadata.author || 'growth-technos-team',
    isFeatured: metadata.isFeatured ?? true,
    isPinned: metadata.isPinned ?? false,
    isTrending: metadata.isTrending ?? false,
    allowComments: true,
    viewCount: 150,
    likeCount: 25,
    difficultyLevel: (metadata.difficultyLevel as BlogDifficultyLevel) || BlogDifficultyLevel.INTERMEDIATE,
    publicationStatus,
    scheduledPublishAt,
    publishedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
    tableOfContents,
    faqSchema,
    html,
  };

  const categoryId = taxonomies.categoryIds.get(blogSeed.categorySlug) || Array.from(taxonomies.categoryIds.values())[0];
  const topicClusterId = taxonomies.topicClusterIds.get(blogSeed.topicClusterSlug) || Array.from(taxonomies.topicClusterIds.values())[0];
  const industryId = taxonomies.industryIds.get(blogSeed.industrySlug) || Array.from(taxonomies.industryIds.values())[0];
  const tagIds = blogSeed.tagSlugs
    .map((slug) => taxonomies.tagIds.get(slug))
    .filter(Boolean) as Types.ObjectId[];

  const result = await upsertBlog(blogSeed, {
    authorId: taxonomies.authorId,
    categoryId,
    tagIds,
    topicClusterId,
    industryId,
  });

  console.log(`✓ MongoDB upsert success: ${result.slug} (Created: ${result.created})`);
  console.log(`  Status: ${publicationStatus} | Scheduled: ${scheduledPublishAt?.toISOString() || 'Live Immediately'}`);
  console.log(`  Table of Contents: ${tableOfContents.length} headings | FAQs: ${faqSchema.length}`);

  // Sync with Frontend blogs.json
  const smartJsonPath = path.resolve(__dirname, '../../../growth-technos-smart/src/content/blogs/blogs.json');
  if (fs.existsSync(smartJsonPath)) {
    const blogsJson = JSON.parse(fs.readFileSync(smartJsonPath, 'utf8'));
    const existingIndex = blogsJson.findIndex((b: any) => b.slug === blogSeed.slug);
    const entry = {
      id: `b-${blogSeed.slug}`,
      slug: blogSeed.slug,
      title: blogSeed.title,
      excerpt: blogSeed.excerpt,
      content: body.slice(0, 300).replace(/\r?\n/g, ' ') + '...',
      image: `/uploads/blogs/${blogSeed.featuredImageFile}`,
      author: 'Growth Technos Team',
      publishedAt: publishedAt.toISOString().slice(0, 10),
      tags: blogSeed.tagSlugs.map((slug) => {
        const found = BLOG_TAGS.find((t) => t.slug === slug);
        return found ? found.name : slug;
      }),
    };

    if (existingIndex >= 0) {
      blogsJson[existingIndex] = entry;
    } else {
      blogsJson.push(entry);
    }

    fs.writeFileSync(smartJsonPath, JSON.stringify(blogsJson, null, 2) + '\n');
    console.log(`✓ Synchronized with frontend blogs.json (Total blogs now: ${blogsJson.length})`);
  }
}

async function main() {
  await connectDatabase();

  const authorId = await upsertAuthor(BLOG_AUTHOR);
  const categoryIds = new Map<string, Types.ObjectId>();
  const tagIds = new Map<string, Types.ObjectId>();
  const industryIds = new Map<string, Types.ObjectId>();
  const topicClusterIds = new Map<string, Types.ObjectId>();

  for (const cat of BLOG_CATEGORIES) categoryIds.set(cat.slug, await upsertCategory(cat));
  for (const tag of BLOG_TAGS) tagIds.set(tag.slug, await upsertTag(tag));
  for (const ind of BLOG_INDUSTRIES) industryIds.set(ind.slug, await upsertIndustry(ind));
  for (const tc of BLOG_TOPIC_CLUSTERS) topicClusterIds.set(tc.slug, await upsertTopicCluster(tc));

  const taxonomies = { authorId, categoryIds, tagIds, industryIds, topicClusterIds };

  const args = process.argv.slice(2);
  const targetPath = args[0];

  if (targetPath) {
    await publishBlogFromMarkdown(path.resolve(targetPath), taxonomies);
  } else {
    const draftsDir = path.resolve(__dirname, '../content/drafts');
    if (!fs.existsSync(draftsDir)) {
      console.log('No drafts directory found at', draftsDir);
      return;
    }
    const files = fs.readdirSync(draftsDir).filter((f) => f.endsWith('.md')).sort();
    console.log(`Found ${files.length} drafts in ${draftsDir}`);
    for (const file of files) {
      await publishBlogFromMarkdown(path.join(draftsDir, file), taxonomies);
    }
  }

  await disconnectDatabase();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal publication error:', err);
    process.exit(1);
  });
}
