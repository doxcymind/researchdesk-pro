export const dynamic = 'force-dynamic'
import Razorpay from 'razorpay'
import { getAuthUser } from '@/lib/auth-helper'

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

    return Response.json({
      subscriptionId: (subscription as any).id,
      keyId: process.env.RAZORPAY_KEY_ID,
      email: user.email,
      name: user.user_metadata?.full_name ?? '',
    })
  } catch (e: any) {
    console.error('Razorpay subscription error:', e)
    return Response.json({ error: e?.message || 'Failed to create subscription' }, { status: 500 })
  }
}
