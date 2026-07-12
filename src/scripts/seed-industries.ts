import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '@core/database/connection';
import { logger } from '@core/logger';
import { runIndustryPagesSeed } from './seed-data/industry-pages.seeder';

/**
 * Production industry solution-page seeder.
 *
 * Idempotent: re-running upserts healthcare / restaurants / salons by slug,
 * creates missing specialty stub services, and attaches related services,
 * portfolio, and blogs when those records already exist.
 *
 * Recommended order for a fresh environment:
 *   1. npm run seed:services-portfolio
 *   2. npm run seed:blogs
 *   3. npm run seed:industries
 */
async function main(): Promise<void> {
  await connectDatabase();

  logger.info('Seeding production industry solution pages...');
  const result = await runIndustryPagesSeed();

  logger.info('Industry pages seed completed successfully', result);
}

main()
  .catch((error) => {
    logger.error('Industry pages seed failed', { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
