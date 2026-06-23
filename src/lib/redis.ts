import { Redis } from "@upstash/redis";

// Initialize Redis only if URLs are provided (graceful degradation if missing)
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/**
 * Cache-aside helper function.
 * @param key The unique cache key.
 * @param fetcher Async function to fetch fresh data if cache misses.
 * @param ttlSeconds Time-to-live in seconds (default 86400 = 24h).
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 86400
): Promise<T> {
  if (!redis) {
    // If Redis is not configured, just run the fetcher directly
    return await fetcher();
  }

  try {
    const cached = await redis.get<T>(key);
    if (cached) {
      console.log(`[Redis] Cache HIT for key: ${key}`);
      return cached;
    }
  } catch (err) {
    console.error(`[Redis] Cache GET error for key: ${key}`, err);
    // On error, fall through to fetch fresh data
  }

  console.log(`[Redis] Cache MISS for key: ${key}. Fetching fresh data...`);
  const freshData = await fetcher();

  // If fetcher returned undefined or null, we might not want to cache it,
  // but let's assume the fetcher throws if it completely fails.
  if (freshData !== undefined && freshData !== null) {
    try {
      await redis.set(key, freshData, { ex: ttlSeconds });
    } catch (err) {
      console.error(`[Redis] Cache SET error for key: ${key}`, err);
    }
  }

  return freshData;
}
