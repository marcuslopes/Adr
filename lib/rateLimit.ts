/**
 * Simple in-memory rate limiter (per-user, resets on server restart).
 * For production, replace with Redis-backed sliding window.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const store = new Map<string, Bucket>();

interface RateLimitOptions {
  /** Max requests per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    // New window
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.windowStart + windowMs,
    };
  }

  bucket.count++;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetAt: bucket.windowStart + windowMs,
  };
}
