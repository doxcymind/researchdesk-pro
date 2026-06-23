import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { WelcomeEmail } from '@/lib/emails/WelcomeEmail'
import { hmacHex, safeEqual } from '@/lib/verify'
import { resend, EMAIL_FROM } from '@/lib/email'
import { welcomeSequence } from '@/lib/emails/sequence'
import { createClient } from '@supabase/supabase-js'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://researchdeskpro.com'
const listUnsubscribe = (url: string) => ({
  'List-Unsubscribe': `<${url}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
})

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    // Authenticate the caller: this is an internal endpoint invoked only by the
    // auth callback, which signs the recipient address with our server secret.
    // This prevents anyone from triggering welcome emails to arbitrary inboxes.
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    const sig = req.headers.get('x-welcome-signature') ?? ''
    if (!secret || !safeEqual(hmacHex(email, secret), sig)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret)

    // Respect a prior unsubscribe — never email a suppressed address.
    try {
      const { data } = await supabase
        .from('onboarding_emails').select('unsubscribed').eq('email', email).maybeSingle()
      if (data?.unsubscribed) {
        return NextResponse.json({ success: true, skipped: 'unsubscribed' })
      }
    } catch { /* table absent on first run — proceed */ }

    // token == the incoming signature == hmacHex(email, serviceRoleKey)
    const unsubscribeUrl = `${SITE}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${sig}`

    const html = await render(WelcomeEmail({ name, unsubscribeUrl }))

    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `Welcome to ResearchDesk Pro — let's write your first manuscript`,
      html,
      headers: listUnsubscribe(unsubscribeUrl),
    })

    // Schedule the onboarding drip (emails 2–5) via Resend's scheduledAt.
    // Isolated so a scheduling hiccup never fails the immediate welcome email.
    try {
      const DAY_MS = 86_400_000
      const results = await Promise.all(
        welcomeSequence.map(async (item) => {
          const body = await render(item.build(name, unsubscribeUrl))
          return resend.emails.send({
            from: EMAIL_FROM,
            to: email,
            subject: item.subject,
            html: body,
            scheduledAt: new Date(Date.now() + item.dayOffset * DAY_MS).toISOString(),
            headers: listUnsubscribe(unsubscribeUrl),
          })
        })
      )
      const scheduledIds = results
        .map((r) => r.data?.id)
        .filter((id): id is string => Boolean(id))

      // Persist scheduled IDs so an unsubscribe can cancel the in-flight drip.
      await supabase.from('onboarding_emails').upsert({
        email, name: name ?? null, scheduled_ids: scheduledIds, unsubscribed: false,
      })
    } catch (seqErr) {
      console.error('Welcome sequence scheduling error:', seqErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Welcome email error:', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
