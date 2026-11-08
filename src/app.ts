import express, { Application } from 'express';
import fs from 'fs';
import path from 'path';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from '@core/config';
import { swaggerSpec } from '@core/config/swagger';
import { logger } from '@core/logger';
import {
  helmetMiddleware,
  corsMiddleware,
  rateLimiter,
  sanitizeMiddleware,
  hppMiddleware,
  compressionMiddleware,
  requestId,
  errorHandler,
  notFoundHandler,
} from '@core/middlewares';
import v1Routes from './api/v1/routes';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(compressionMiddleware);
  app.use(rateLimiter);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use(sanitizeMiddleware);
  app.use(hppMiddleware);

  const uploadsDir =
    [
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'growth-technos-backend', 'uploads'),
      path.resolve(__dirname, '../uploads'),
      path.resolve(__dirname, '../../uploads'),
    ].find((dir) => fs.existsSync(dir)) || path.join(process.cwd(), 'uploads');

  app.use(
    '/uploads',
    express.static(uploadsDir, {
      maxAge: env.NODE_ENV === 'production' ? '7d' : 0,
      etag: true,
      lastModified: true,
    }),
  );

  morgan.token('request-id', (req) => (req as express.Request).requestId ?? '-');
  app.use(
    morgan(':request-id :method :url :status :response-time ms', {
      stream: { write: (message) => logger.http(message.trim()) },
    }),
  );

  if (env.SWAGGER_ENABLED) {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
  }

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'Growth Technos Backend API is running',
      docs: '/api/docs',
      health: '/health',
      version: env.API_VERSION,
    });
  });

  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      message: 'Growth Technos API is running',
      data: {
        environment: env.NODE_ENV,
        version: env.API_VERSION,
        timestamp: new Date().toISOString(),
      },
      errors: [],
      meta: null,
    });
  });

  app.use(`/api/${env.API_VERSION}`, v1Routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
