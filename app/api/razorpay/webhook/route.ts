export const dynamic = 'force-dynamic'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!

  // Verify webhook signature
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  if (expected !== signature) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)
  const entity = event?.payload?.subscription?.entity

  // Handle subscription activation (trial start / payment authorized)
  if (
    event.event === 'subscription.activated' ||
    event.event === 'subscription.charged' ||
    event.event === 'payment.authorized'
  ) {
    const subscriptionId =
      entity?.id ?? event?.payload?.payment?.entity?.subscription_id

    if (subscriptionId) {
      // Find user by razorpay_subscription_id and activate their plan
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('razorpay_subscription_id', subscriptionId)
        .single()

      if (profile?.id) {
        await supabase.from('profiles').update({
          subscription_status: 'scholar',
        }).eq('id', profile.id)
      }
    }
  }

  // Handle subscription cancellation / halted
  if (event.event === 'subscription.cancelled' || event.event === 'subscription.halted') {
    const subscriptionId = entity?.id
    if (subscriptionId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('razorpay_subscription_id', subscriptionId)
        .single()

      if (profile?.id) {
        await supabase.from('profiles').update({
          subscription_status: 'free',
        }).eq('id', profile.id)
      }
    }
  }

  return Response.json({ received: true })
}
