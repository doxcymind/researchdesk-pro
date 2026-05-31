import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature error:', err)
    return new Response('Webhook error', { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const setSubscription = async (customerId: string, status: string) => {
    await supabase
      .from('profiles')
      .update({ subscription_status: status })
      .eq('stripe_customer_id', customerId)
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any
      if (session.mode === 'subscription') {
        await setSubscription(session.customer, 'scholar')
      }
      break
    }
    case 'invoice.paid': {
      const invoice = event.data.object as any
      await setSubscription(invoice.customer, 'scholar')
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as any
      await setSubscription(invoice.customer, 'past_due')
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as any
      await setSubscription(sub.customer, 'free')
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as any
      const status = sub.status === 'active' ? 'scholar' : sub.status === 'past_due' ? 'past_due' : 'free'
      await setSubscription(sub.customer, status)
      break
    }
  }

  return new Response('ok', { status: 200 })
}
