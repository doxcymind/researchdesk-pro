import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth-helper'

export async function PATCH(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, title } = await req.json()
  if (!projectId || !title?.trim()) return Response.json({ error: 'projectId and title required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify ownership
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !project) return Response.json({ error: 'Project not found' }, { status: 404 })

  const { error } = await supabase
    .from('projects')
    .update({ title: title.trim() })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
