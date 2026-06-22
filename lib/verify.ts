import crypto from 'crypto'

/**
 * Constant-time string comparison. Safe against timing attacks and
 * unequal-length inputs (timingSafeEqual throws if lengths differ).
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

/** Hex-encoded HMAC-SHA256 of `data` keyed by `secret`. */
export function hmacHex(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}
