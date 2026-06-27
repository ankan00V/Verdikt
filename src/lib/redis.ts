import { Redis } from "@upstash/redis";
import type { RunnableConfig } from "@langchain/core/runnables";

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

/**
 * Wraps a LangGraph node function with per-node Redis result caching.
 *
 * Problem: When Vercel times out and the frontend reconnects, LangGraph may
 * re-run nodes that already completed (due to checkpoint restoration failures).
 * This wrapper caches each node's output in Redis keyed by (thread_id + node_name).
 * On a re-run, it returns the cached result in <100ms instead of re-doing
 * expensive LLM or API work, making re-runs effectively free.
 *
 * Cache TTL is 1 hour — same as the checkpoint TTL.
 */
export function withNodeCache<S extends object>(
  nodeId: string,
  nodeFn: (state: S, config?: RunnableConfig) => Promise<Partial<S>>
): (state: S, config?: RunnableConfig) => Promise<Partial<S>> {
  return async (state: S, config?: RunnableConfig): Promise<Partial<S>> => {
    const threadId = config?.configurable?.thread_id as string | undefined;

    if (redis && threadId) {
      const cacheKey = `node_result:${threadId}:${nodeId}`;
      try {
        const cached = await redis.get<Partial<S>>(cacheKey);
        if (cached) {
          console.log(`[NodeCache] HIT for ${nodeId} (thread: ${threadId}) — returning cached result`);
          return cached;
        }
      } catch (err) {
        console.error(`[NodeCache] GET error for ${nodeId}:`, err);
      }

      // Run the actual node
      const result = await nodeFn(state, config);

      // Cache the result for 1 hour
      try {
        if (result && Object.keys(result).length > 0) {
          await redis.set(cacheKey, result, { ex: 3600 });
          console.log(`[NodeCache] Cached result for ${nodeId} (thread: ${threadId})`);
        }
      } catch (err) {
        console.error(`[NodeCache] SET error for ${nodeId}:`, err);
      }

      return result;
    }

    // Fallback: no Redis or no thread_id — just run the node directly
    return nodeFn(state, config);
  };
}
