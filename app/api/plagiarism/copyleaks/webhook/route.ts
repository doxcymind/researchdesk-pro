import { createClient } from '@supabase/supabase-js'
import { hmacHex, safeEqual } from '@/lib/verify'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const scanId = searchParams.get('scanId')
  if (!scanId) return new Response('ok', { status: 200 })

  // Authenticate the callback: only our own server can produce a valid sig,
  // since the webhook URL was signed with the Copyleaks API key at submit time.
  // (Return 200 so a forged caller can't probe which scanIds exist.)
  const sig = searchParams.get('sig') ?? ''
  const secret = process.env.COPYLEAKS_KEY ?? ''
  if (!secret || !safeEqual(hmacHex(scanId, secret), sig)) {
    return new Response('ok', { status: 200 })
  }

  let body: Record<string, any>
  try { body = await req.json() } catch { return new Response('ok', { status: 200 }) }

  const supabase = getAdmin()
  const status   = Number(body.status ?? -1)

  // Progress updates (queued / processing) — ignore
  if (status === 1 || status === 2) return new Response('ok', { status: 200 })

  // Copyleaks v3 completion: body has 'scannedDocument' + 'results' (no status field)
  // OR legacy status 410
  const isComplete = body.scannedDocument != null || body.results != null || status === 410

  if (isComplete) {
    const score   = body.results?.score?.aggregatedScore ?? null
    const results = body.results ?? null

    await supabase
      .from('plagiarism_scans')
      .update({ status: 'complete', similarity_score: score, results })
      .eq('scan_id', scanId)

    return new Response('ok', { status: 200 })
  }

  // Error codes from Copyleaks (e.g. 200 = scan error, 404 = not found, etc.)
  const errorCode = body.errorCode ?? body.code ?? status
  await supabase
    .from('plagiarism_scans')
    .update({ status: 'error', error_message: `Copyleaks error (code ${errorCode})` })
    .eq('scan_id', scanId)

  return new Response('ok', { status: 200 })
}
