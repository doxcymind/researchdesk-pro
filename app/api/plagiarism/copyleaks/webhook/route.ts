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

export async function POST(req: Request) {
  // Copyleaks sends a webhook when the scan status changes
  // Status 410 = completed successfully
  let body: { status?: number; developerPayload?: string; error?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response('ok', { status: 200 })
  }

  const scanId = body.developerPayload
  if (!scanId) return new Response('ok', { status: 200 })

  const supabase = getAdmin()

  // Any non-success status → mark as error
  if (body.status !== 410) {
    await supabase
      .from('plagiarism_scans')
      .update({ status: 'error', error_message: `Scan failed with status ${body.status}` })
      .eq('scan_id', scanId)
    return new Response('ok', { status: 200 })
  }

  // Fetch results from Copyleaks
  try {
    const token = await getCopyleaksToken()
    const resultsRes = await fetch(
      `https://api.copyleaks.com/v3/education/${encodeURIComponent(scanId)}/results`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!resultsRes.ok) {
      await supabase
        .from('plagiarism_scans')
        .update({ status: 'error', error_message: 'Could not fetch scan results' })
        .eq('scan_id', scanId)
      return new Response('ok', { status: 200 })
    }

    const results = await resultsRes.json()

    // Copyleaks score: aggregatedScore is 0-100 (% similar)
    const similarityScore = results?.score?.aggregatedScore ?? null

    await supabase
      .from('plagiarism_scans')
      .update({
        status: 'complete',
        similarity_score: similarityScore,
        results: results,
      })
      .eq('scan_id', scanId)
  } catch (err) {
    console.error('Copyleaks webhook processing error:', err)
    await supabase
      .from('plagiarism_scans')
      .update({ status: 'error', error_message: 'Failed to process scan results' })
      .eq('scan_id', scanId)
  }

  return new Response('ok', { status: 200 })
}
