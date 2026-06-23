import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

// Create a new ratelimiter, that allows 5 requests per 1 hour
export const ratelimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      analytics: true,
      // Optional prefix for the keys:
      prefix: "@upstash/ratelimit",
    })
  : null;
