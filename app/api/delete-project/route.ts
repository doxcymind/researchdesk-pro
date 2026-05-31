import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth-helper'

export async function DELETE(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await req.json()
  if (!projectId) return Response.json({ error: 'projectId required' }, { status: 400 })

  // Use service role key to bypass RLS entirely
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify the project belongs to this user first
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !project) {
    return Response.json({ error: 'Project not found' }, { status: 404 })
  }

  // Delete all related records then the project
  const tables = [
    'project_sections',
    'publication_checks',
    'activity_logs',
    'uploads',
    'journal_submissions',
  ]

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('project_id', projectId)
    if (error) console.error(`Error deleting from ${table}:`, error.message)
  }

  const { error } = await supabase.from('projects').delete().eq('id', projectId).eq('user_id', user.id)
  if (error) {
    console.error('Error deleting project:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
