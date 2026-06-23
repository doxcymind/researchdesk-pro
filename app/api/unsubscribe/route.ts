export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { resend } from '@/lib/email'
import { hmacHex, safeEqual } from '@/lib/verify'

// Unsubscribe from the onboarding email sequence.
// Link form:  GET  /api/unsubscribe?email=<addr>&token=<hmac>
// One-click:  POST /api/unsubscribe?email=<addr>&token=<hmac>  (RFC 8058)
// token = HMAC-SHA256(email, SUPABASE_SERVICE_ROLE_KEY) — same value the auth
// callback signs welcome emails with, so only our own links validate.

function confirmationPage(message: string, ok: boolean): Response {
  const color = ok ? '#c9943a' : '#e5604d'
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ResearchDesk Pro</title></head>
<body style="margin:0;background:#080C18;font-family:system-ui,sans-serif;color:#f0e8d0;display:flex;min-height:100vh;align-items:center;justify-content:center">
<div style="max-width:440px;padding:40px;text-align:center">
<div style="color:${color};font-size:20px;margin-bottom:16px">✦</div>
<h1 style="font-size:22px;margin:0 0 12px">${message}</h1>
<p style="color:rgba(200,175,130,0.6);line-height:1.6;margin:0 0 24px">${ok
  ? "You won't receive any more onboarding emails. You'll still get essential account emails (like receipts)."
  : 'This unsubscribe link is invalid or has expired.'}</p>
<a href="https://researchdeskpro.com" style="color:#c9943a;text-decoration:none">← Back to ResearchDesk Pro</a>
</div></body></html>`
  return new Response(html, { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html' } })
}

async function unsubscribe(req: Request): Promise<boolean> {
  const { searchParams } = new URL(req.url)
  const email = (searchParams.get('email') || '').toLowerCase().trim()
  const token = searchParams.get('token') || ''
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!email || !secret || !safeEqual(hmacHex(email, secret), token)) return false

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret)

  // Cancel any still-scheduled drip emails (best effort).
  try {
    const { data } = await supabase
      .from('onboarding_emails').select('scheduled_ids').eq('email', email).maybeSingle()
    for (const id of data?.scheduled_ids ?? []) {
      try { await resend.emails.cancel(id) } catch { /* already sent / gone */ }
    }
  } catch { /* table may be empty for this address */ }

  try {
    await supabase.from('onboarding_emails').upsert({
      email, unsubscribed: true, unsubscribed_at: new Date().toISOString(),
    })
  } catch (e) {
    console.error('Unsubscribe persist error:', e)
  }
  return true
}

export async function GET(req: Request) {
  const ok = await unsubscribe(req)
  return confirmationPage(ok ? "You're unsubscribed" : 'Invalid link', ok)
}

// RFC 8058 one-click unsubscribe (Gmail / Apple Mail header button).
export async function POST(req: Request) {
  const ok = await unsubscribe(req)
  return new Response(ok ? 'ok' : 'invalid', { status: ok ? 200 : 400 })
}
