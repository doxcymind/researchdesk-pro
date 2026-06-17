// Cashfree Subscriptions (PG v5) server helpers.
// Auth uses x-client-id / x-client-secret; the same client secret is the
// webhook signing key. Set CASHFREE_ENV=production to hit the live gateway.

const isProd = process.env.CASHFREE_ENV === 'production'

export const CASHFREE_MODE: 'production' | 'sandbox' = isProd ? 'production' : 'sandbox'

export const CASHFREE_BASE = isProd
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg'

export function cashfreeHeaders(): Record<string, string> {
  return {
    'x-client-id': process.env.CASHFREE_CLIENT_ID!,
    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET!,
    'x-api-version': '2025-01-01',
    'Content-Type': 'application/json',
  }
}

// Normalize to a bare 10-digit Indian mobile (strips +91 / 0 / spaces / dashes).
// Returns null if it isn't a valid mobile — Cashfree needs this for the mandate.
export function normalizeIndianPhone(raw?: string | null): string | null {
  if (!raw) return null
  let d = String(raw).replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return /^[6-9]\d{9}$/.test(d) ? d : null
}
