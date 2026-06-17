export const dynamic = 'force-dynamic'
import { getAuthUser } from '@/lib/auth-helper'
import { createClient } from '@supabase/supabase-js'
import { CASHFREE_BASE, CASHFREE_MODE, cashfreeHeaders, normalizeIndianPhone } from '@/lib/cashfree'

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { returnPath, phone: phoneInput } = await req.json().catch(() => ({}) as any)

    const origin =
      req.headers.get('origin') ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')

    // Cashfree requires a valid mobile for the mandate. Prefer what the user
    // just entered, fall back to anything already on their auth profile.
    const phone = normalizeIndianPhone(
      phoneInput ||
        (user as any).phone ||
        user.user_metadata?.phone ||
        user.user_metadata?.phone_number
    )
    if (!phone) {
      // Signal the client to collect a phone number, then retry.
      return Response.json({ error: 'PHONE_REQUIRED' }, { status: 422 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Remember the number so the user is never asked again (renewals, retries).
    if (phoneInput) {
      await supabase.auth.admin
        .updateUserById(user.id, {
          user_metadata: { ...user.user_metadata, phone },
        })
        .catch(() => {})
    }

    // First charge happens after a 7-day free trial.
    const trialEndAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const subscriptionId = `sub_${user.id.slice(0, 8)}_${Date.now()}`

    const payload = {
      subscription_id: subscriptionId,
      customer_details: {
        customer_name:
          user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        customer_email: user.email,
        customer_phone: phone,
      },
      // Plan (₹499 / month, 12 cycles) is created once — see scripts/setup-cashfree-plan.mjs
      plan_details: { plan_id: process.env.CASHFREE_PLAN_ID! },
      authorization_details: {
        authorization_amount: 1, // ₹1 mandate validation, refunded
        authorization_amount_refund: true,
        payment_methods: ['upi', 'card', 'enach'],
      },
      subscription_meta: {
        return_url: `${origin}${returnPath || '/'}?subscription=success`,
        notification_channel: ['EMAIL'],
      },
      subscription_first_charge_time: trialEndAt,
      subscription_tags: { supabase_user_id: user.id, plan: 'scholar' },
    }

    const res = await fetch(`${CASHFREE_BASE}/subscriptions`, {
      method: 'POST',
      headers: cashfreeHeaders(),
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok || !data?.subscription_session_id) {
      console.error('Cashfree subscription error:', data)
      return Response.json(
        { error: data?.message || 'Failed to create subscription' },
        { status: 500 }
      )
    }

    // Store subscription ID immediately so the webhook / activate can match it.
    await supabase.from('profiles').upsert({
      id: user.id,
      cashfree_subscription_id: subscriptionId,
    })

    return Response.json({
      subscriptionSessionId: data.subscription_session_id,
      mode: CASHFREE_MODE,
    })
  } catch (e: any) {
    console.error('Cashfree subscription error:', e)
    return Response.json(
      { error: e?.message || 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
