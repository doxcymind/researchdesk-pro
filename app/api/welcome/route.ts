import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { WelcomeEmail } from '@/lib/emails/WelcomeEmail'
import { hmacHex, safeEqual } from '@/lib/verify'
import { resend, EMAIL_FROM } from '@/lib/email'
import { welcomeSequence } from '@/lib/emails/sequence'

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

    const html = await render(WelcomeEmail({ name }))

    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `Welcome to ResearchDesk Pro — let's write your first manuscript`,
      html,
    })

    // Schedule the onboarding drip (emails 2–5) via Resend's scheduledAt.
    // Isolated so a scheduling hiccup never fails the immediate welcome email.
    try {
      const DAY_MS = 86_400_000
      await Promise.all(
        welcomeSequence.map(async (item) => {
          const body = await render(item.build(name))
          return resend.emails.send({
            from: EMAIL_FROM,
            to: email,
            subject: item.subject,
            html: body,
            scheduledAt: new Date(Date.now() + item.dayOffset * DAY_MS).toISOString(),
          })
        })
      )
    } catch (seqErr) {
      console.error('Welcome sequence scheduling error:', seqErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Welcome email error:', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
