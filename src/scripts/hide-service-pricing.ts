import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '@core/database/connection';
import { Service } from '@modules/services/model/service.model';
import { logger } from '@core/logger';

/**
 * Sets showPricing=false on every service so public prices stay hidden by default.
 */
async function hideServicePricing(): Promise<void> {
  await connectDatabase();

  const result = await Service.updateMany({}, { $set: { showPricing: false } });
  logger.info(`Updated showPricing=false on ${result.modifiedCount} service(s) (${result.matchedCount} matched)`);

  await disconnectDatabase();
}

hideServicePricing().catch(async (error) => {
  logger.error('Failed to hide service pricing', error);
  try {
    await disconnectDatabase();
  } catch {
    // ignore
  }
  process.exit(1);
});
