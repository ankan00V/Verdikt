import { getRedis } from "./redis";

/**
 * Retrieves a value from the Redis cache.
 * @param key The cache key
 * @returns The parsed JSON object, or null if not found or Redis is disabled
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const data = await redis.get(key);
    if (data) {
      console.log(`[Cache] HIT for key: ${key}`);
      // Upstash Redis automatically parses JSON if it was stored as an object
      return data as T;
    }
  } catch (error) {
    console.warn(`[Cache] Error reading key ${key}:`, error);
  }
  
  console.log(`[Cache] MISS for key: ${key}`);
  return null;
}

/**
 * Stores a value in the Redis cache.
 * @param key The cache key
 * @param data The data to store (will be JSON stringified by Upstash)
 * @param ttlSeconds Time-to-live in seconds
 */
export async function setCache<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(key, data, { ex: ttlSeconds });
    console.log(`[Cache] SET for key: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.warn(`[Cache] Error setting key ${key}:`, error);
  }
}
