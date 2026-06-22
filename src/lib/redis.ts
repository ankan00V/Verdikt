import { Redis } from "@upstash/redis";
import { getEnv } from "./config";

let redisClient: Redis | null = null;

export const getRedis = () => {
  if (redisClient) return redisClient;

  const env = getEnv();
  
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    return redisClient;
  }

  return null;
};
