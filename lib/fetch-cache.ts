'use client';

interface FetchCacheEntry {
  data: unknown;
  expiresAt: number;
}

// Module-level in-process cache — shared across all client components in the same tab.
const cache = new Map<string, FetchCacheEntry>();

export async function cachedFetch<T = unknown>(
  url: string,
  options?: RequestInit,
  ttlMs = 30_000
): Promise<T> {
  const key = url + (options?.body ? String(options.body) : '');
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.data as T;
  }
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const data = (await res.json()) as T;
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
}

export function invalidateClientCache(urlPrefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(urlPrefix)) cache.delete(key);
  }
}
