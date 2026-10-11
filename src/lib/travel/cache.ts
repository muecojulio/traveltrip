import type { Quote } from "./types.ts";

async function dbSql() {
  const { getSql } = await import("../db.ts");
  return getSql();
}

const QUOTE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PURGE_INTERVAL_MS = 5 * 60 * 1000; // Run DB cleanup at most every 5 minutes

type MemoryEntry<T> = {
  value: T;
  expiresAt: number;
};

/**
 * Bounded L1 in-memory LRU cache with strict TTL expiration.
 */
export class MemoryLruCache<T> {
  private readonly store = new Map<string, MemoryEntry<T>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 128) {
    this.maxEntries = maxEntries;
  }

  get(key: string, now = Date.now()): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now) {
      this.store.delete(key);
      return null;
    }
    // Refresh LRU order
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number, now = Date.now()): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, { value, expiresAt: now + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

const l1QuoteCache = new MemoryLruCache<Quote>(120);
const l1ServiceCache = new MemoryLruCache<unknown>(256);
const inFlightRequests = new Map<string, Promise<unknown>>();
let lastPurgeAt = 0;

/**
 * Deduplicate concurrent identical async operations so parallel callers share one promise.
 */
export async function dedupeInFlight<T>(key: string, task: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const promise = task().finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * Throttled cleanup of expired rows in `quote_cache` and `service_cache`,
 * leveraging `quote_cache_expires_at_idx` and `service_cache_expires_at_idx`.
 */
async function maybePurgeExpiredCache(): Promise<void> {
  const now = Date.now();
  if (now - lastPurgeAt < PURGE_INTERVAL_MS) return;
  lastPurgeAt = now;
  try {
    const sql = await dbSql();
    await sql`
      delete from quote_cache
      where expires_at < now() - interval '30 minutes'
         or fetched_at < now() - interval '2 days'
    `;
    await sql`
      delete from service_cache
      where expires_at < now()
    `;
  } catch {
    // Best-effort maintenance
  }
}

type QuoteCacheMetadata = {
  destinationId: string;
  originIata: string;
  checkIn: string;
  bestTotalMxn: number | null;
};

/**
 * Read a fresh quote from L1 memory cache or L2 Postgres/PGLite `quote_cache` (TTL: 5 min).
 */
export async function readQuoteCache(key: string): Promise<Quote | null> {
  const fromMemory = l1QuoteCache.get(key);
  if (fromMemory) {
    return { ...fromMemory, cached: true };
  }

  try {
    const sql = await dbSql();
    const rows = await sql<{ payload: string }>`
      update quote_cache
      set hit_count = coalesce(hit_count, 0) + 1
      where cache_key = ${key}
        and expires_at > now()
        and fetched_at > now() - interval '5 minutes'
      returning payload
    `;
    const payload = rows[0]?.payload;
    if (!payload) return null;
    const quote = JSON.parse(payload) as Quote;
    l1QuoteCache.set(key, quote, QUOTE_TTL_MS);
    return { ...quote, cached: true };
  } catch {
    return null;
  }
}

/**
 * Read a recently expired quote (up to 30 minutes old) as a fallback when upstream
 * providers time out or fail.
 */
export async function readStaleQuoteCache(key: string): Promise<Quote | null> {
  try {
    const sql = await dbSql();
    const rows = await sql<{ payload: string }>`
      select payload from quote_cache
      where cache_key = ${key}
        and fetched_at > now() - interval '30 minutes'
      limit 1
    `;
    const payload = rows[0]?.payload;
    if (!payload) return null;
    const quote = JSON.parse(payload) as Quote;
    return { ...quote, cached: true };
  } catch {
    return null;
  }
}

/**
 * Write a quote snapshot to both L1 memory cache and L2 Postgres/PGLite `quote_cache`
 * with indexed metadata columns.
 */
export async function writeQuoteCache(
  key: string,
  quote: Quote,
  meta: QuoteCacheMetadata,
): Promise<void> {
  const normalizedQuote: Quote = { ...quote, cached: false };
  l1QuoteCache.set(key, normalizedQuote, QUOTE_TTL_MS);

  try {
    const sql = await dbSql();
    const payload = JSON.stringify(normalizedQuote);
    await sql`
      insert into quote_cache (
        cache_key,
        payload,
        destination_id,
        origin_iata,
        check_in,
        best_total_mxn,
        fetched_at,
        expires_at,
        hit_count
      )
      values (
        ${key},
        ${payload},
        ${meta.destinationId},
        ${meta.originIata},
        ${meta.checkIn},
        ${meta.bestTotalMxn},
        now(),
        now() + interval '5 minutes',
        0
      )
      on conflict (cache_key) do update set
        payload = excluded.payload,
        destination_id = excluded.destination_id,
        origin_iata = excluded.origin_iata,
        check_in = excluded.check_in,
        best_total_mxn = excluded.best_total_mxn,
        fetched_at = now(),
        expires_at = now() + interval '5 minutes'
    `;
    void maybePurgeExpiredCache();
  } catch {
    // Search continues even if L2 DB write fails.
  }
}

/**
 * Invalidate a specific quote cache entry (used when `forceRefresh` is requested).
 */
export function invalidateQuoteCacheMemory(key: string): void {
  l1QuoteCache.delete(key);
}

/**
 * Read/write helper for auxiliary service lookups (FX rate, geocoding, weather)
 * backed by L1 memory + L2 `service_cache` table.
 */
export async function withServiceCache<T>(
  cacheKey: string,
  category: "fx" | "geo" | "weather",
  ttlSeconds: number,
  fetcher: () => Promise<T | null>,
): Promise<T | null> {
  const memHit = l1ServiceCache.get(cacheKey) as T | null;
  if (memHit !== null && memHit !== undefined) {
    return memHit;
  }

  try {
    const sql = await dbSql();
    const rows = await sql<{ payload: string }>`
      select payload from service_cache
      where cache_key = ${cacheKey}
        and expires_at > now()
      limit 1
    `;
    if (rows[0]?.payload) {
      const parsed = JSON.parse(rows[0].payload) as T;
      l1ServiceCache.set(cacheKey, parsed, ttlSeconds * 1000);
      return parsed;
    }
  } catch {
    // Fall through to live fetch
  }

  const fresh = await dedupeInFlight(`svc:${cacheKey}`, fetcher);
  if (fresh === null || fresh === undefined) return null;

  l1ServiceCache.set(cacheKey, fresh, ttlSeconds * 1000);
  try {
    const sql = await dbSql();
    const payload = JSON.stringify(fresh);
    await sql`
      insert into service_cache (cache_key, category, payload, fetched_at, expires_at)
      values (
        ${cacheKey},
        ${category},
        ${payload},
        now(),
        now() + (${ttlSeconds} * interval '1 second')
      )
      on conflict (cache_key) do update set
        payload = excluded.payload,
        fetched_at = now(),
        expires_at = now() + (${ttlSeconds} * interval '1 second')
    `;
  } catch {
    // Ignore DB cache write errors
  }

  return fresh;
}
