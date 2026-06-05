export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const { email, secret } = await req.json()

  if (secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  const { error: upsertError } = await supabase.from('profiles').upsert({
    id: user.id,
    subscription_status: 'scholar',
  })

  if (upsertError) return Response.json({ error: upsertError.message }, { status: 500 })

  return Response.json({ success: true, userId: user.id })
}
