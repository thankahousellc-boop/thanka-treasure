import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";

/**
 * IP-based rate limiting backed by Upstash Redis.
 *
 * On Vercel the runtime is multi-instance, so in-memory counters are unreliable;
 * Upstash gives a shared, serverless-friendly store. When the Upstash env vars
 * are not configured (local dev / CI), the limiter no-ops and every request is
 * allowed — so nothing breaks without a Redis instance.
 */

type LimiterName = "strict" | "standard";

// Window/limit per purpose. `strict` for expensive or abuse-prone endpoints
// (uploads, checkout, contact); `standard` for cheap high-frequency ones
// (view counters, error logging, newsletter).
const LIMITS: Record<LimiterName, { tokens: number; window: `${number} ${"s" | "m"}` }> = {
  strict: { tokens: 5, window: "1 m" },
  standard: { tokens: 20, window: "1 m" },
};

const redis =
  serverEnv.UPSTASH_REDIS_REST_URL && serverEnv.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: serverEnv.UPSTASH_REDIS_REST_URL,
        token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const limiters = new Map<LimiterName, Ratelimit>();

function getLimiter(name: LimiterName): Ratelimit | null {
  if (!redis) {
    return null;
  }

  let limiter = limiters.get(name);
  if (!limiter) {
    const { tokens, window } = LIMITS[name];
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `ratelimit:${name}`,
      analytics: false,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]!.trim();
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimitResult =
  | { success: true }
  | { success: false; retryAfterSeconds: number };

/**
 * Check the rate limit for a request. `identifier` defaults to the client IP;
 * pass a custom key (e.g. an email) to limit on a different dimension.
 */
export async function checkRateLimit(
  name: LimiterName,
  request: Request,
  identifier?: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter(name);
  if (!limiter) {
    return { success: true };
  }

  const key = identifier ?? getClientIp(request);
  const { success, reset } = await limiter.limit(key);
  if (success) {
    return { success: true };
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return { success: false, retryAfterSeconds };
}

/** Standard 429 response with a Retry-After header. */
export function rateLimitedResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}

/**
 * Convenience guard: returns a 429 NextResponse if the limit is exceeded, or
 * null if the request may proceed.
 *
 *   const limited = await enforceRateLimit("strict", request);
 *   if (limited) return limited;
 */
export async function enforceRateLimit(
  name: LimiterName,
  request: Request,
  identifier?: string,
): Promise<NextResponse | null> {
  const result = await checkRateLimit(name, request, identifier);
  if (result.success) {
    return null;
  }
  return rateLimitedResponse(result.retryAfterSeconds);
}
