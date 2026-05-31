export const dynamic = 'force-dynamic'
import crypto from 'crypto'
import { getAuthUser } from '@/lib/auth-helper'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    return Response.json({ error: 'Invalid payment signature' }, { status: 400 })
  }

  // Update subscription in Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase.from('profiles').upsert({
    id: user.id,
    subscription_status: 'scholar',
    razorpay_payment_id,
  })

  return Response.json({ success: true })
}
