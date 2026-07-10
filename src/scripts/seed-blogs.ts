import 'dotenv/config';
import { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '@core/database/connection';
import { logger } from '@core/logger';
import { BLOG_POSTS } from './seed-data/blog-posts.data';
import {
  upsertAuthor,
  upsertBlog,
  upsertCategory,
  upsertIndustry,
  upsertTag,
  upsertTopicCluster,
} from './seed-data/blog-seeder.helpers';
import {
  BLOG_AUTHOR,
  BLOG_CATEGORIES,
  BLOG_INDUSTRIES,
  BLOG_TAGS,
  BLOG_TOPIC_CLUSTERS,
} from './seed-data/blog-taxonomy.data';

async function seedBlogTaxonomy(): Promise<{
  authorIds: Map<string, Types.ObjectId>;
  categoryIds: Map<string, Types.ObjectId>;
  tagIds: Map<string, Types.ObjectId>;
  industryIds: Map<string, Types.ObjectId>;
  topicClusterIds: Map<string, Types.ObjectId>;
}> {
  const authorIds = new Map<string, Types.ObjectId>();
  const categoryIds = new Map<string, Types.ObjectId>();
  const tagIds = new Map<string, Types.ObjectId>();
  const industryIds = new Map<string, Types.ObjectId>();
  const topicClusterIds = new Map<string, Types.ObjectId>();

  const authorId = await upsertAuthor(BLOG_AUTHOR);
  authorIds.set(BLOG_AUTHOR.slug, authorId);

  for (const category of BLOG_CATEGORIES) {
    const id = await upsertCategory(category);
    categoryIds.set(category.slug, id);
  }

  for (const tag of BLOG_TAGS) {
    const id = await upsertTag(tag);
    tagIds.set(tag.slug, id);
  }

  for (const industry of BLOG_INDUSTRIES) {
    const id = await upsertIndustry(industry);
    industryIds.set(industry.slug, id);
  }

  for (const cluster of BLOG_TOPIC_CLUSTERS) {
    const id = await upsertTopicCluster(cluster);
    topicClusterIds.set(cluster.slug, id);
  }

  return { authorIds, categoryIds, tagIds, industryIds, topicClusterIds };
}

async function seedBlogPosts(
  maps: Awaited<ReturnType<typeof seedBlogTaxonomy>>,
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const post of BLOG_POSTS) {
    const authorId = maps.authorIds.get(post.authorSlug);
    const categoryId = maps.categoryIds.get(post.categorySlug);
    const industryId = maps.industryIds.get(post.industrySlug);
    const topicClusterId = maps.topicClusterIds.get(post.topicClusterSlug);

    if (!authorId || !categoryId || !industryId || !topicClusterId) {
      throw new Error(`Missing taxonomy reference for blog "${post.slug}"`);
    }

    const tagIds = post.tagSlugs.map((slug) => {
      const id = maps.tagIds.get(slug);
      if (!id) throw new Error(`Missing tag "${slug}" for blog "${post.slug}"`);
      return id;
    });

    const result = await upsertBlog(post, {
      authorId,
      categoryId,
      tagIds,
      topicClusterId,
      industryId,
    });

    if (result.created) created += 1;
    else updated += 1;

    logger.info(`Blog ${result.created ? 'created' : 'updated'}`, {
      slug: result.slug,
      title: post.title,
    });
  }

  return { created, updated };
}

async function seedBlogs(): Promise<void> {
  await connectDatabase();

  logger.info('Seeding blog taxonomy (authors, categories, tags, industries, topic clusters)...');
  const taxonomy = await seedBlogTaxonomy();

  logger.info('Seeding blog posts...');
  const stats = await seedBlogPosts(taxonomy);

  logger.info('Blog seed completed', {
    postsTotal: BLOG_POSTS.length,
    postsCreated: stats.created,
    postsUpdated: stats.updated,
    categories: BLOG_CATEGORIES.length,
    tags: BLOG_TAGS.length,
    industries: BLOG_INDUSTRIES.length,
    topicClusters: BLOG_TOPIC_CLUSTERS.length,
  });

  await disconnectDatabase();
  process.exit(0);
}

seedBlogs().catch(async (error) => {
  logger.error('Blog seed failed', { error });
  try {
    await disconnectDatabase();
  } catch {
    // ignore disconnect errors during failure
  }
  process.exit(1);
});
