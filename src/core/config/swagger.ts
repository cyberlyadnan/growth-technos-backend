import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: `${env.APP_NAME} API`,
      version: '1.0.0',
      description: 'Enterprise SaaS Platform API — CMS, CRM, Leads, Portfolio & more',
    },
    servers: [
      { url: `${env.APP_URL}/api/${env.API_VERSION}`, description: 'Current environment' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'accessToken' },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { nullable: true },
            errors: { type: 'array', items: { type: 'object' } },
            meta: { nullable: true },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  },
  apis: ['./src/modules/**/routes/*.ts', './src/api/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
