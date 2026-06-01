import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth-helper'
import { randomUUID } from 'crypto'

// Server-side client — uses service role to bypass RLS (auth is handled by getAuthUser)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)


export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await req.json()

  // Verify ownership
  const { data: project } = await supabase
    .from('projects').select('id, title, study_type').eq('id', projectId).eq('user_id', user.id).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 403 })

  // Upsert share token
  const token = randomUUID()
  const { data: existing } = await supabase
    .from('project_sections').select('id, content')
    .eq('project_id', projectId).eq('user_id', user.id).eq('section', '__share_token__').single()

  if (existing) {
    try {
      const existingToken = JSON.parse(existing.content).token
      return NextResponse.json({ token: existingToken, url: `/share/${existingToken}` })
    } catch {
      // Malformed content — fall through and create a new token
    }
  }

  await supabase.from('project_sections').insert({
    project_id: projectId, user_id: user.id,
    section: '__share_token__',
    content: JSON.stringify({ token, projectId, createdAt: new Date().toISOString() })
  })

  return NextResponse.json({ token, url: `/share/${token}` })
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  // Service role client — bypasses RLS for public share token lookups
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Validate token is a UUID to prevent LIKE injection
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_REGEX.test(token)) {
    return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
  }

  // Find project by token — section value is __share_token__, content contains the UUID
  const { data: row } = await supabaseAdmin
    .from('project_sections').select('project_id, user_id')
    .eq('section', '__share_token__')
    .ilike('content', `%"token":"${token}"%`)
    .single()

  if (!row) return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 })

  const [{ data: project }, { data: sections }] = await Promise.all([
    supabaseAdmin.from('projects').select('title, study_type, created_at').eq('id', row.project_id).single(),
    supabaseAdmin.from('project_sections').select('section, content')
      .eq('project_id', row.project_id).eq('user_id', row.user_id)
      .not('section', 'like', '__%__')
  ])

  return NextResponse.json({ project, sections: sections || [] })
}
