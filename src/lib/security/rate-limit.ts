import 'server-only'
import { headers } from 'next/headers'

/**
 * Fixed-window, in-memory rate limiter. Adequate for a single instance and as
 * a first line of defence on serverless (each instance keeps its own window).
 * For strict global limits, back `hit()` with a shared store such as Redis;
 * the call sites do not need to change.
 */
interface Window {
  count: number
  resetAt: number
}

const buckets = new Map<string, Window>()
const MAX_KEYS = 10_000

export interface RateLimitRule {
  limit: number
  windowMs: number
}

export const RATE_LIMITS = {
  search: { limit: 60, windowMs: 60_000 },
  auth: { limit: 10, windowMs: 10 * 60_000 },
  personal: { limit: 120, windowMs: 60_000 },
  admin: { limit: 60, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>

export function hit(key: string, rule: RateLimitRule, now = Date.now()): { allowed: boolean; retryAfterMs: number } {
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, w] of buckets) if (w.resetAt <= now) buckets.delete(k)
      if (buckets.size >= MAX_KEYS) buckets.clear()
    }
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs })
    return { allowed: true, retryAfterMs: 0 }
  }
  current.count += 1
  return current.count > rule.limit ? { allowed: false, retryAfterMs: current.resetAt - now } : { allowed: true, retryAfterMs: 0 }
}

export async function clientKey(scope: string): Promise<string> {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  return `${scope}:${ip}`
}

export async function rateLimit(scope: keyof typeof RATE_LIMITS) {
  return hit(await clientKey(scope), RATE_LIMITS[scope])
}
