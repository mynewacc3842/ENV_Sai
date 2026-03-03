/**
 * Rate limiter using Redis (falls back to in-memory for dev)
 */

import { redis } from "@/lib/db/redis";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// In-memory fallback for when Redis is unavailable
const memoryStore = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();

  if (redis) {
    return redisRateLimit(key, maxRequests, windowMs, now);
  }

  return memoryRateLimit(key, maxRequests, windowMs, now);
}

async function redisRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  now: number
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;
  const windowStart = now - windowMs;

  const pipeline = redis!.pipeline();
  // Remove expired entries
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  // Count current window
  pipeline.zcard(redisKey);
  // Add current request
  pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
  // Set TTL
  pipeline.pexpire(redisKey, windowMs);

  const results = await pipeline.exec();
  const count = (results?.[1]?.[1] as number) || 0;

  return {
    allowed: count < maxRequests,
    remaining: Math.max(0, maxRequests - count - 1),
    resetAt: now + windowMs,
  };
}

function memoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  now: number
): RateLimitResult {
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count++;
  return {
    allowed: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}
