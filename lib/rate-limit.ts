/**
 * Simple in-memory rate limiter.
 * For production at scale, swap with Upstash Redis.
 */
const store = new Map<string, { count: number; reset: number }>()

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count }
}

/** Extract best available IP from request */
export function getIP(req: Request): string {
  const fwd = (req as any).headers?.get?.('x-forwarded-for')
  return fwd?.split(',')[0]?.trim() ?? 'unknown'
}
