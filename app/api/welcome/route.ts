import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { WelcomeEmail } from '@/lib/emails/WelcomeEmail'
import { hmacHex, safeEqual } from '@/lib/verify'

const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')

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
      from: 'ResearchDesk Pro <onboarding@resend.dev>',
      to: email,
      subject: `Welcome to ResearchDesk Pro — let's write your first manuscript`,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Welcome email error:', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
