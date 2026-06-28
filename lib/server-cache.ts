interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class ServerCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

// Module-level singleton — shared across all requests in the same server process.
// In serverless environments this resets per cold start, which is fine.
const g = globalThis as typeof globalThis & { _minervaServerCache?: ServerCache };
if (!g._minervaServerCache) g._minervaServerCache = new ServerCache();
export const serverCache = g._minervaServerCache;
