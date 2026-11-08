import "server-only";

/**
 * Small fixed-window limiter for the public assistant endpoint.
 *
 * It is intentionally process-local: the assistant is a read-only public
 * endpoint, and a single Node process is the deployment target. If the app is
 * ever scaled horizontally, move this to a shared store rather than trusting
 * per-instance counters.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const MAX_BUCKETS = 5_000;

const buckets = new Map<string, Bucket>();

function sweep(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
};

export function rateLimit(key: string): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
      resetAt: bucket.resetAt,
      limit: MAX_REQUESTS,
    };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - existing.count),
    resetAt: existing.resetAt,
    limit: MAX_REQUESTS,
  };
}

/** Best-effort client address. Proxies must be trusted before this is relied on. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
