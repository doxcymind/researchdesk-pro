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

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return Response.json({ error: 'No subscription found' }, { status: 404 })
  }

  const origin = req.headers.get('origin') || 'https://researchdesk-pro.vercel.app'

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${origin}/dashboard`,
  })

  return Response.json({ url: session.url })
}
