/**
 * Durable rate limiter.
 *
 * Uses Upstash Redis (REST) for a shared, atomic fixed-window counter that
 * works across Vercel's serverless instances. If the Upstash env vars are not
 * configured, it transparently falls back to a best-effort in-memory counter
 * so the app keeps working (e.g. local dev) — set the env vars in production
 * to get real, cross-instance enforcement:
 *
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const upstashEnabled = Boolean(UPSTASH_URL && UPSTASH_TOKEN)

type Result = { allowed: boolean; remaining: number }

// ---- In-memory fallback (per-instance; not durable) ----------------------
const store = new Map<string, { count: number; reset: number }>()

function memoryLimit(key: string, maxRequests: number, windowMs: number): Result {
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

// ---- Upstash (durable, cross-instance) -----------------------------------
async function upstashLimit(key: string, maxRequests: number, windowMs: number): Promise<Result> {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000))
  // Atomic fixed window: INCR, and set the TTL only on the first hit (NX).
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', `rl:${key}`],
      ['EXPIRE', `rl:${key}`, windowSec, 'NX'],
    ]),
    signal: AbortSignal.timeout(1000),
  })

  if (!res.ok) throw new Error(`Upstash ${res.status}`)
  const data = (await res.json()) as Array<{ result?: number; error?: string }>
  const count = Number(data?.[0]?.result ?? 0)
  if (!Number.isFinite(count) || count <= 0) throw new Error('Upstash bad response')

  const remaining = Math.max(0, maxRequests - count)
  return { allowed: count <= maxRequests, remaining }
}

/**
 * Check (and consume) one unit against the rate limit for `key`.
 * Fails open to the in-memory limiter if Upstash is unreachable.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<Result> {
  if (upstashEnabled) {
    try {
      return await upstashLimit(key, maxRequests, windowMs)
    } catch {
      // Redis hiccup — degrade to in-memory rather than 500 the user.
      return memoryLimit(key, maxRequests, windowMs)
    }
  }
  return memoryLimit(key, maxRequests, windowMs)
}

/** Extract best available IP from request */
export function getIP(req: Request): string {
  const fwd = (req as any).headers?.get?.('x-forwarded-for')
  return fwd?.split(',')[0]?.trim() ?? 'unknown'
}
