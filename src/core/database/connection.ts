import mongoose from 'mongoose';
import { env } from '@core/config';
import { loggers } from '@core/logger';

mongoose.set('strictQuery', true);

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    loggers.db.info('MongoDB connected successfully', {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    });
  } catch (error) {
    loggers.db.error('MongoDB connection failed', { error });
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  loggers.db.info('MongoDB disconnected');
}

mongoose.connection.on('error', (error) => {
  loggers.db.error('MongoDB connection error', { error: error.message });
});

mongoose.connection.on('disconnected', () => {
  loggers.db.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  loggers.db.info('MongoDB reconnected');
});

export { mongoose };
