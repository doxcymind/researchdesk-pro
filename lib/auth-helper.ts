import { createClient } from '@supabase/supabase-js'

/**
 * Verifies the Bearer token in the Authorization header.
 * Returns the authenticated user or null.
 */
export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}
