import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabaseAdmin = makeSupabaseAdmin()

    // Get user from token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = user.id

    // Delete all user data
    await Promise.all([
      supabaseAdmin.from('project_sections').delete().eq('user_id', userId),
      supabaseAdmin.from('projects').delete().eq('user_id', userId),
      supabaseAdmin.from('profiles').delete().eq('id', userId),
    ])

    // Delete auth account
    await supabaseAdmin.auth.admin.deleteUser(userId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete account error:', err)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
