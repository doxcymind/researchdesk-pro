import { createClient } from '@supabase/supabase-js'

const WHITELISTED_EMAILS = [
  'nechmed0080@gmail.com',
  'gaur.gsvm@gmail.com',
  'pheonixfire968@gmail.com',
]

/**
 * Server-side subscription check. Returns true if the user has Scholar access.
 * Use this in every gated API route to prevent client-side bypass.
 */
export async function isScholarServer(userId: string, userEmail?: string | null): Promise<boolean> {
  // Whitelist check — server-side only, never shipped to the client
  if (userEmail && WHITELISTED_EMAILS.includes(userEmail.toLowerCase())) return true

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', userId)
    .single()

  return data?.subscription_status === 'scholar'
}
