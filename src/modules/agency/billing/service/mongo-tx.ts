import mongoose, { type ClientSession } from 'mongoose';
import { loggers } from '@core/logger';

/**
 * Run work inside a MongoDB multi-document transaction when the deployment supports it
 * (replica set / mongos). Falls back to sequential execution with caller-owned optimistic locks
 * when transactions are unavailable (standalone).
 */
export async function withOptionalTransaction<T>(
  work: (session: ClientSession | null) => Promise<T>,
): Promise<T> {
  let session: ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    let result!: T;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const unsupported =
      /Transaction numbers are only allowed|replica set|not supported|IllegalOperation/i.test(
        message,
      );
    if (session && unsupported) {
      loggers.admin.warn('MongoDB transactions unavailable; using optimistic locking fallback', {
        message,
      });
      try {
        session.endSession();
      } catch {
        /* ignore */
      }
      return work(null);
    }
    throw error;
  } finally {
    if (session) {
      try {
        session.endSession();
      } catch {
        /* ignore */
      }
    }
  }
}
