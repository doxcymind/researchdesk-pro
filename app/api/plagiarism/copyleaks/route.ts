import { getAuthUser } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { isScholarServer } from '@/lib/check-subscription'
import { createClient } from '@supabase/supabase-js'

const COPYLEAKS_EMAIL = process.env.COPYLEAKS_EMAIL
const COPYLEAKS_KEY   = process.env.COPYLEAKS_KEY
const SITE_URL        = process.env.NEXT_PUBLIC_SITE_URL || 'https://researchdesk-pro.vercel.app'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function getCopyleaksToken(): Promise<string> {
  const res = await fetch('https://id.copyleaks.com/v3/account/login/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: COPYLEAKS_EMAIL, key: COPYLEAKS_KEY }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Copyleaks login failed: ${err}`)
  }
  const data = await res.json()
  return data.access_token as string
}

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const scholar = await isScholarServer(user.id, user.email)
  if (!scholar) return Response.json({ error: 'Scholar plan required' }, { status: 403 })

  if (!COPYLEAKS_EMAIL || !COPYLEAKS_KEY) {
    return Response.json({ error: 'Copyleaks is not configured. Please contact support.' }, { status: 503 })
  }

  const { allowed } = rateLimit(`${user.id}:copyleaks`, 5, 60000)
  if (!allowed) return Response.json({ error: 'Rate limit exceeded. Please wait a minute.' }, { status: 429 })

  let text: string
  try {
    const body = await req.json()
    text = String(body.text || '').trim()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!text) return Response.json({ error: 'No text provided' }, { status: 400 })
  if (text.length < 50) return Response.json({ error: 'Text too short (minimum 50 characters)' }, { status: 400 })

  const truncated = text.slice(0, 25000)
  const scanId    = `rd-${user.id.slice(0, 8)}-${Date.now()}`

  try {
    const token = await getCopyleaksToken()
    const base64Content = Buffer.from(truncated, 'utf-8').toString('base64')

    const submitRes = await fetch(
      `https://api.copyleaks.com/v3/education/submit/file/${encodeURIComponent(scanId)}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64: base64Content,
          filename: `manuscript_${scanId}.txt`,
          properties: {
            webhooks: {
              // Embed scanId in URL — more reliable than developerPayload
              status: `${SITE_URL}/api/plagiarism/copyleaks/webhook?scanId=${encodeURIComponent(scanId)}`,
            },
            sensitiveDataProtection: { anonymizeText: true },
            scanning: { internet: true, copyleaksDatabaseAccess: true },
          },
        }),
      }
    )

    if (!submitRes.ok) {
      const err = await submitRes.text()
      throw new Error(`Copyleaks submission failed: ${err}`)
    }

    // Save pending record to DB
    const supabase = getAdmin()
    await supabase.from('plagiarism_scans').insert({
      user_id:  user.id,
      scan_id:  scanId,
      status:   'pending',
    })

    return Response.json({ scanId, message: 'Scan submitted. Results will appear here in 1–3 minutes.' })
  } catch (error) {
    console.error('Copyleaks submission error:', error)
    const msg = error instanceof Error ? error.message : 'Submission failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}
