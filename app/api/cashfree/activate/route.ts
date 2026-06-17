export const dynamic = 'force-dynamic'
import { getAuthUser } from '@/lib/auth-helper'
import { createClient } from '@supabase/supabase-js'
import { CASHFREE_BASE, cashfreeHeaders } from '@/lib/cashfree'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WHITELISTED_EMAILS = [
  'nechmed0080@gmail.com',
  'gaur.gsvm@gmail.com',
  'pheonixfire968@gmail.com',
]

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Whitelist: always activate
  if (user.email && WHITELISTED_EMAILS.includes(user.email.toLowerCase())) {
    await supabase.from('profiles').upsert({
      id: user.id,
      subscription_status: 'scholar',
    })
    return Response.json({ success: true, reason: 'whitelist' })
  }

  // Check if user has a Cashfree subscription ID stored
  const { data: profile } = await supabase
    .from('profiles')
    .select('cashfree_subscription_id, subscription_status')
    .eq('id', user.id)
    .single()

  if (!profile?.cashfree_subscription_id) {
    return Response.json({ error: 'No subscription found' }, { status: 404 })
  }

  // Already active
  if (profile.subscription_status === 'scholar') {
    return Response.json({ success: true, reason: 'already_active' })
  }

  // Verify with Cashfree API
  try {
    const res = await fetch(
      `${CASHFREE_BASE}/subscriptions/${profile.cashfree_subscription_id}`,
      { headers: cashfreeHeaders() }
    )
    const sub = await res.json()

    // Mandate approved (trial active or billing live) => grant access.
    if (sub?.subscription_status === 'ACTIVE') {
      await supabase.from('profiles').upsert({
        id: user.id,
        subscription_status: 'scholar',
      })
      return Response.json({ success: true, reason: 'cashfree_verified' })
    }

    return Response.json(
      { error: `Subscription status: ${sub?.subscription_status ?? 'unknown'}` },
      { status: 402 }
    )
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Failed to verify' }, { status: 500 })
  }
}
