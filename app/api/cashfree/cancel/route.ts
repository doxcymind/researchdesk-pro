export const dynamic = 'force-dynamic'
import { getAuthUser } from '@/lib/auth-helper'
import { createClient } from '@supabase/supabase-js'
import { CASHFREE_BASE, cashfreeHeaders } from '@/lib/cashfree'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('cashfree_subscription_id, subscription_status')
    .eq('id', user.id)
    .single()

  const subscriptionId = profile?.cashfree_subscription_id
  if (!subscriptionId) {
    return Response.json({ error: 'No active subscription to cancel' }, { status: 404 })
  }

  // Cancel the mandate at Cashfree (PG Subscriptions "manage" API).
  try {
    const res = await fetch(
      `${CASHFREE_BASE}/subscriptions/${subscriptionId}/manage`,
      {
        method: 'POST',
        headers: cashfreeHeaders(),
        body: JSON.stringify({ subscription_id: subscriptionId, action: 'CANCEL' }),
      }
    )
    const data = await res.json().catch(() => ({}))

    // Treat an already-cancelled subscription as success (idempotent).
    const alreadyGone =
      res.status === 404 ||
      /cancel|not.*active|already/i.test(String(data?.message ?? ''))

    if (!res.ok && !alreadyGone) {
      console.error('Cashfree cancel error:', data)
      return Response.json(
        { error: data?.message || 'Failed to cancel subscription' },
        { status: 502 }
      )
    }

    // Revoke access immediately and unlink so it can't auto-reactivate.
    // (The webhook will also fire a CANCELLED event as a backstop.)
    await supabase
      .from('profiles')
      .update({ subscription_status: 'free', cashfree_subscription_id: null })
      .eq('id', user.id)

    return Response.json({ success: true })
  } catch (e: any) {
    console.error('Cashfree cancel error:', e)
    return Response.json({ error: e?.message || 'Failed to cancel' }, { status: 500 })
  }
}
