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

    const order = await razorpay.orders.create({
      amount: 49900,
      currency: 'INR',
      receipt: `rcpt_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { supabase_user_id: user.id, plan: 'scholar' },
    })

    return Response.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    })
  } catch (e: any) {
    console.error('Razorpay order error:', e)
    return Response.json({ error: e?.message || 'Failed to create order' }, { status: 500 })
  }
}
