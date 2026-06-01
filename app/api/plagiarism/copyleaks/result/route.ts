import { getAuthUser } from '@/lib/auth-helper'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const scanId = searchParams.get('scanId')
  if (!scanId) return Response.json({ error: 'Missing scanId' }, { status: 400 })

  const supabase = getAdmin()
  const { data } = await supabase
    .from('plagiarism_scans')
    .select('status, similarity_score, results, error_message')
    .eq('scan_id', scanId)
    .eq('user_id', user.id)
    .single()

  if (!data) return Response.json({ status: 'pending' })

  return Response.json(data)
}
