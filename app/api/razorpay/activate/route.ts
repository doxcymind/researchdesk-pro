export const dynamic = 'force-dynamic'
import Razorpay from 'razorpay'
import { getAuthUser } from '@/lib/auth-helper'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WHITELISTED_EMAILS = [
  'nechmed0080@gmail.com',
  'gaur.gsvm@gmail.com',
  'pheonixfire968@gmail.com',
  'itsthetimemsd@gmail.com',
]

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Whitelist: always activate
  if (user.email && WHITELISTED_EMAILS.includes(user.email.toLowerCase())) {
    await supabase.from('profiles').upsert({
      id: user.id,
      subscription_status: 'scholar',
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    return Response.json({ success: true, reason: 'whitelist' })
  }

  // Check if user has a Razorpay subscription ID stored
  const { data: profile } = await supabase
    .from('profiles')
    .select('razorpay_subscription_id, subscription_status')
    .eq('id', user.id)
    .single()

  if (!profile?.razorpay_subscription_id) {
    return Response.json({ error: 'No subscription found' }, { status: 404 })
  }

  // Already active
  if (profile.subscription_status === 'scholar') {
    return Response.json({ success: true, reason: 'already_active' })
  }

  // Verify with Razorpay API
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })

    const sub = await razorpay.subscriptions.fetch(profile.razorpay_subscription_id) as any

    // Activate if subscription is in any valid state (created, authenticated, active)
    const validStates = ['created', 'authenticated', 'active']
    if (validStates.includes(sub.status)) {
      await supabase.from('profiles').upsert({
        id: user.id,
        subscription_status: 'scholar',
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      return Response.json({ success: true, reason: 'razorpay_verified', status: sub.status })
    }

    return Response.json({ error: `Subscription status: ${sub.status}` }, { status: 402 })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Failed to verify' }, { status: 500 })
  }
}
