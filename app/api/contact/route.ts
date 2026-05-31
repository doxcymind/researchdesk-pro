import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simple in-memory rate limit: max 3 submissions per IP per hour
const rateLimitMap = new Map<string, { count: number; reset: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + 3600_000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  try {
    const { name, email, topic, message } = await req.json()
    if (!name || !email || !topic || !message) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'ResearchDesk Contact <onboarding@resend.dev>',
      to: ['itsthetimemsd@gmail.com'],
      replyTo: email,
      subject: `[ResearchDesk] ${topic} — from ${name}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 32px; border-radius: 12px;">
          <h2 style="color: #c9943a; margin: 0 0 24px; font-size: 22px;">New Contact Form Submission</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666; width: 100px; font-weight: 600;">Name</td><td style="padding: 8px 0; color: #111;">${name}</td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-weight: 600;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #c9943a;">${email}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-weight: 600;">Topic</td><td style="padding: 8px 0; color: #111;">${topic}</td></tr>
          </table>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e5e5;" />
          <h3 style="color: #333; margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Message</h3>
          <p style="color: #444; line-height: 1.7; white-space: pre-wrap; background: #fff; padding: 16px; border-radius: 8px; border: 1px solid #e5e5e5;">${message}</p>
          <p style="color: #aaa; font-size: 12px; margin-top: 24px;">Sent via ResearchDesk contact form · ${new Date().toLocaleString('en-GB')}</p>
        </div>
      `,
    })

    // Auto-reply to sender
    await resend.emails.send({
      from: 'ResearchDesk <onboarding@resend.dev>',
      to: [email],
      subject: 'We received your message — ResearchDesk',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #080c18; padding: 40px; border-radius: 12px; color: #f0e8d0;">
          <h2 style="color: #c9943a; margin: 0 0 16px;">Message Received ✦</h2>
          <p style="color: rgba(240,232,208,0.7); line-height: 1.7; margin: 0 0 12px;">Hi ${name},</p>
          <p style="color: rgba(240,232,208,0.7); line-height: 1.7; margin: 0 0 24px;">Thanks for reaching out. We've received your message about <strong style="color: #c9943a;">${topic}</strong> and will get back to you within 24 hours.</p>
          <p style="color: rgba(240,232,208,0.4); font-size: 13px; margin: 0;">— The ResearchDesk Team</p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
