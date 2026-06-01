import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: Request) {
  // scanId is embedded in the webhook URL as ?scanId=...
  const { searchParams } = new URL(req.url)
  const scanId = searchParams.get('scanId')
  if (!scanId) return new Response('ok', { status: 200 })

  let body: {
    status?: number
    results?: {
      score?: { aggregatedScore?: number }
      internet?: unknown[]
      database?: unknown[]
    }
    error?: unknown
  }

  try {
    body = await req.json()
  } catch {
    return new Response('ok', { status: 200 })
  }

  const supabase = getAdmin()
  const status   = Number(body.status ?? 0)

  // Status 1 = queued, 2 = processing — still running, ignore
  if (status === 1 || status === 2) {
    return new Response('ok', { status: 200 })
  }

  // Status 410 = completed — results are in the webhook body
  if (status === 410) {
    const score   = body.results?.score?.aggregatedScore ?? null
    const results = body.results ?? null

    await supabase
      .from('plagiarism_scans')
      .update({ status: 'complete', similarity_score: score, results })
      .eq('scan_id', scanId)

    return new Response('ok', { status: 200 })
  }

  // Any other status = error
  await supabase
    .from('plagiarism_scans')
    .update({ status: 'error', error_message: `Scan failed with Copyleaks status ${status}` })
    .eq('scan_id', scanId)

  return new Response('ok', { status: 200 })
}
