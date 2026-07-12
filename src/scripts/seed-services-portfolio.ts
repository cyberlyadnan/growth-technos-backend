import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '@core/database/connection';
import { logger } from '@core/logger';
import {
  seedCaseStudyProjects,
  seedCmsIndustries,
  seedCmsRelationships,
  seedPortfolioShowcase,
  seedServicesCatalog,
} from './seed-data/cms-seeder.helpers';

async function main(): Promise<void> {
  await connectDatabase();

  logger.info('Seeding CMS industries...');
  const industryIds = await seedCmsIndustries();
  logger.info(`Seeded ${industryIds.size} industries`);

  logger.info('Seeding services catalog from frontend services-data.ts...');
  const serviceIds = await seedServicesCatalog();
  logger.info(`Seeded ${serviceIds.size} services`);

  logger.info('Seeding portfolio showcase sites...');
  const showcaseIds = await seedPortfolioShowcase();
  logger.info(`Seeded ${showcaseIds.size} showcase portfolio items`);

  logger.info('Seeding case study projects from frontend projects-data.json...');
  const projectIds = await seedCaseStudyProjects();
  logger.info(`Seeded ${projectIds.size} case study projects`);

  logger.info('Linking CMS relationships...');
  await seedCmsRelationships(serviceIds, projectIds);
  logger.info('CMS relationship links updated');

  logger.info('CMS services & portfolio seed completed successfully', {
    industries: industryIds.size,
    services: serviceIds.size,
    showcase: showcaseIds.size,
    caseStudies: projectIds.size,
  });
}

main()
  .catch((error) => {
    logger.error('CMS seed failed', { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
