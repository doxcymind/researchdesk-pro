export const dynamic = 'force-dynamic'
import Razorpay from 'razorpay'
import { getAuthUser } from '@/lib/auth-helper'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })

    // Calculate trial end date (7 days from now)
    const trialEndAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60

    const subscriptionPayload: Record<string, any> = {
      plan_id: process.env.RAZORPAY_PLAN_ID!,
      total_count: 12,
      quantity: 1,
      start_at: trialEndAt, // Start billing after 7-day trial
      notes: {
        supabase_user_id: user.id,
        plan: 'scholar',
      },
    }

    const subscription = await razorpay.subscriptions.create(subscriptionPayload as any)
    const subscriptionId = (subscription as any).id

    // Store subscription ID immediately so auto-activation can verify it after payment
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await supabase.from('profiles').upsert({
      id: user.id,
      razorpay_subscription_id: subscriptionId,
    })

    return Response.json({
      subscriptionId,
      keyId: process.env.RAZORPAY_KEY_ID,
      email: user.email,
      name: user.user_metadata?.full_name ?? '',
    })
  } catch (e: any) {
    console.error('Razorpay subscription error:', e)
    return Response.json({ error: e?.message || 'Failed to create subscription' }, { status: 500 })
  }
}
