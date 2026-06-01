import { getAuthUser } from '@/lib/auth-helper'
import { createClient } from '@supabase/supabase-js'
import { extractText } from 'unpdf'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

const MAX_CHARS_PER_FILE = 4000   // ~1000 words per PDF
const MAX_TOTAL_CHARS   = 12000   // total context budget

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let projectId: number
  try {
    const body = await req.json()
    projectId = Number(body.projectId)
    if (!projectId) return Response.json({ context: '' })
  } catch {
    return Response.json({ context: '' })
  }

  const supabase = getAdmin()

  // Fetch upload records for this project
  const { data: uploads, error } = await supabase
    .from('uploads')
    .select('file_name, file_path')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5) // max 5 files

  if (error || !uploads?.length) return Response.json({ context: '', files: [] })

  const parts: string[] = []
  const fileNames: string[] = []

  for (const upload of uploads) {
    try {
      // Download from Supabase storage
      const { data, error: dlErr } = await supabase.storage
        .from('research-files')
        .download(upload.file_path)

      if (dlErr || !data) continue

      const buffer = await data.arrayBuffer()
      const { text } = await extractText(new Uint8Array(buffer), { mergePages: true })

      if (!text?.trim()) continue

      const truncated = text.trim().slice(0, MAX_CHARS_PER_FILE)
      parts.push(`=== ${upload.file_name} ===\n${truncated}`)
      fileNames.push(upload.file_name)
    } catch {
      // skip files that fail to extract
    }
  }

  const context = parts.join('\n\n').slice(0, MAX_TOTAL_CHARS)
  return Response.json({ context, files: fileNames })
}
