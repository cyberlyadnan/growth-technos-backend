import 'dotenv/config';
import { createApp } from './app';
import { env } from '@core/config';
import { connectDatabase } from '@core/database/connection';
import { logger } from '@core/logger';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 ${env.APP_NAME} API running`, {
      port: env.PORT,
      environment: env.NODE_ENV,
      api: `${env.APP_URL}/api/${env.API_VERSION}`,
      docs: env.SWAGGER_ENABLED ? `${env.APP_URL}/api/docs` : 'disabled',
    });
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
