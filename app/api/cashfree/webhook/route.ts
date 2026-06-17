export const dynamic = 'force-dynamic'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  // Cashfree signs the RAW body, so read it as text before parsing.
  const raw = await req.text()
  const signature = req.headers.get('x-webhook-signature') ?? ''
  const timestamp = req.headers.get('x-webhook-timestamp') ?? ''
  const secret = process.env.CASHFREE_CLIENT_SECRET!

  // Verify: base64( HMAC-SHA256( timestamp + rawBody, clientSecret ) )
  const expected = crypto
    .createHmac('sha256', secret)
    .update(timestamp + raw)
    .digest('base64')

  if (expected !== signature) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(raw)
  const type: string = event?.type ?? ''
  const data = event?.data ?? {}
  const sub = data.subscription_details ?? data.subscription ?? data

  const subscriptionId: string | undefined =
    sub.subscription_id ?? data.subscription_id
  const status: string | undefined =
    sub.subscription_status ?? data.subscription_status

  if (!subscriptionId) return Response.json({ received: true })

  const activate =
    type === 'SUBSCRIPTION_PAYMENT_SUCCESS' || status === 'ACTIVE'

  const deactivate =
    type === 'SUBSCRIPTION_PAYMENT_CANCELLED' ||
    ['CANCELLED', 'CUSTOMER_CANCELLED', 'COMPLETED', 'EXPIRED', 'ON_HOLD'].includes(
      status ?? ''
    )

  if (activate || deactivate) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('cashfree_subscription_id', subscriptionId)
      .single()

    if (profile?.id) {
      await supabase
        .from('profiles')
        .update({ subscription_status: activate ? 'scholar' : 'free' })
        .eq('id', profile.id)
    }
  }

  return Response.json({ received: true })
}
