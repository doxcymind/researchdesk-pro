import { getAuthUser } from '@/lib/auth-helper'
import { createClient } from '@supabase/supabase-js'

const COPYLEAKS_EMAIL = process.env.COPYLEAKS_EMAIL
const COPYLEAKS_KEY   = process.env.COPYLEAKS_KEY

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
  if (!res.ok) throw new Error('Copyleaks login failed')
  const data = await res.json()
  return data.access_token as string
}

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const scanId = searchParams.get('scanId')
  if (!scanId) return Response.json({ error: 'Missing scanId' }, { status: 400 })

  const supabase = getAdmin()

  // Check DB first — webhook may have already delivered results
  const { data: row } = await supabase
    .from('plagiarism_scans')
    .select('status, similarity_score, results, error_message, created_at')
    .eq('scan_id', scanId)
    .eq('user_id', user.id)
    .single()

  if (!row) return Response.json({ status: 'not_found' })

  // Already resolved
  if (row.status === 'complete' || row.status === 'error') {
    return Response.json(row)
  }

  // Still pending — directly poll Copyleaks API so we don't depend solely on webhooks
  if (!COPYLEAKS_EMAIL || !COPYLEAKS_KEY) {
    return Response.json(row)
  }

  try {
    const token = await getCopyleaksToken()

    // Check scan completion via results endpoint
    const resultsRes = await fetch(
      `https://api.copyleaks.com/v3/education/${encodeURIComponent(scanId)}/results`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (resultsRes.status === 200) {
      // Scan is complete — parse and persist
      const results = await resultsRes.json()
      const similarityScore = results?.score?.aggregatedScore ?? null

      await supabase
        .from('plagiarism_scans')
        .update({ status: 'complete', similarity_score: similarityScore, results })
        .eq('scan_id', scanId)

      return Response.json({
        status: 'complete',
        similarity_score: similarityScore,
        results,
      })
    }

    if (resultsRes.status === 404 || resultsRes.status === 400) {
      // Scan not yet complete — still processing
      return Response.json({ status: 'pending' })
    }

    // Any other status — still treat as pending
    return Response.json({ status: 'pending' })

  } catch {
    // If Copyleaks call fails, return DB state (still pending)
    return Response.json(row)
  }
}
