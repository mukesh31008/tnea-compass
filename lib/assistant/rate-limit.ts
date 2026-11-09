import "server-only";

/**
 * Small fixed-window limiter for the public assistant endpoint.
 *
 * The in-memory limiter is the fallback. When UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are set, the counter lives in a shared Redis so
 * multiple serverless instances see the same window. No package is required;
 * it uses the Upstash REST API.
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

function localRateLimit(key: string): RateLimitResult {
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

async function upstashCommand(command: (string | number)[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Upstash is not configured");

  const response = await fetch(url.replace(/\/+$/, ""), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(2_000),
  });
  if (!response.ok) throw new Error(`Upstash HTTP ${response.status}`);
  const payload = (await response.json()) as { result?: unknown };
  return payload.result;
}

export async function rateLimit(key: string): Promise<RateLimitResult> {
  if (!process.env.UPSTASH_REDIS_REST_URL) return localRateLimit(key);

  const redisKey = `tnea:assistant:${key}`;
  try {
    const count = Number(await upstashCommand(["INCR", redisKey]));
    if (count === 1) {
      await upstashCommand(["EXPIRE", redisKey, Math.ceil(WINDOW_MS / 1000)]);
    }
    const ttl = Number(await upstashCommand(["TTL", redisKey]));
    return {
      allowed: count <= MAX_REQUESTS,
      remaining: Math.max(0, MAX_REQUESTS - count),
      resetAt: Date.now() + Math.max(1, Number.isFinite(ttl) ? ttl : 60) * 1000,
      limit: MAX_REQUESTS,
    };
  } catch (error) {
    console.warn("Shared rate limiter unavailable, using local fallback:", error);
    return localRateLimit(key);
  }
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
