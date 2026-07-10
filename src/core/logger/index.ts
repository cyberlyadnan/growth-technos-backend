import winston from 'winston';
import path from 'path';
import { env, isProduction } from '@core/config';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}]: ${stack ?? message}${metaStr}`;
});

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: combine(
      colorize({ all: !isProduction }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      logFormat,
    ),
  }),
];

if (isProduction) {
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: combine(timestamp(), errors({ stack: true }), json()),
    }),
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      format: combine(timestamp(), errors({ stack: true }), json()),
    }),
  );
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: 'growth-technos-api' },
  transports,
  exitOnError: false,
});

export const loggers = {
  api: logger.child({ category: 'api' }),
  db: logger.child({ category: 'database' }),
  auth: logger.child({ category: 'auth' }),
  security: logger.child({ category: 'security' }),
  admin: logger.child({ category: 'admin' }),
  email: logger.child({ category: 'email' }),
  queue: logger.child({ category: 'queue' }),
};
