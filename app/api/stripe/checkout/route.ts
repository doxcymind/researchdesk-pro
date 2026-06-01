export const dynamic = 'force-dynamic'
import { stripe } from '@/lib/stripe'
import { getAuthUser } from '@/lib/auth-helper'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('profiles').upsert({ id: user.id, stripe_customer_id: customerId })
  }

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://researchdesk-pro.vercel.app'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: process.env.STRIPE_SCHOLAR_PRICE_ID!, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/pricing`,
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
  })

  return Response.json({ url: session.url })
}
