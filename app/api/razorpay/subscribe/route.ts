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

    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID!,
      total_count: 12,
      quantity: 1,
      notes: {
        supabase_user_id: user.id,
        plan: 'scholar',
      },
    } as any)

    return Response.json({
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      email: user.email,
      name: user.user_metadata?.full_name ?? '',
    })
  } catch (e: any) {
    console.error('Razorpay subscription error:', e)
    return Response.json({ error: e?.message || 'Failed to create subscription' }, { status: 500 })
  }
}
