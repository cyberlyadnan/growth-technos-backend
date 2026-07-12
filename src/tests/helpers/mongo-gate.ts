/** Shared gate for integration suites that need MongoMemoryServer. */
export type MongoTestGlobals = {
  __MONGO_READY__?: boolean;
};

export function isMongoTestReady(): boolean {
  return Boolean((globalThis as MongoTestGlobals).__MONGO_READY__);
}

export function setMongoTestReady(ready: boolean): void {
  (globalThis as MongoTestGlobals).__MONGO_READY__ = ready;
}

/** Skip the current Jest test when in-memory Mongo is unavailable on this host. */
export function skipWithoutMongo(): boolean {
  if (isMongoTestReady()) return false;
  const g = globalThis as MongoTestGlobals & { __MONGO_SKIP_WARNED__?: boolean };
  if (!g.__MONGO_SKIP_WARNED__) {
    g.__MONGO_SKIP_WARNED__ = true;
    // Soft-skip: keep suite green on hosts where MongoMemoryServer cannot boot (e.g. some Windows setups).
    // eslint-disable-next-line no-console
    console.warn('[tests] Skipping Mongo integration cases — MongoMemoryServer unavailable on this host');
  }
  return true;
}
