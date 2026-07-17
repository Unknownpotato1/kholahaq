/**
 * Simple in-memory rate limiter for search / unlock APIs.
 *
 * Production note: in a multi-instance Vercel deployment this should be
 * upgraded to Upstash Redis. For single-instance deployments / preview
 * this is sufficient.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export function rateLimit(opts: RateLimitOptions): { ok: boolean; retryAfter: number; remaining: number } {
  const now = Date.now();
  const b = buckets.get(opts.key);
  if (!b || b.resetAt < now) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, retryAfter: 0, remaining: opts.limit - 1 };
  }
  if (b.count >= opts.limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000), remaining: 0 };
  }
  b.count += 1;
  return { ok: true, retryAfter: 0, remaining: opts.limit - b.count };
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Strip dangerous NoSQL-injection characters from a search query. */
export function sanitizeQuery(q: string): string {
  return q.replace(/[.$\[\]#/]/g, "").slice(0, 80).trim();
}
