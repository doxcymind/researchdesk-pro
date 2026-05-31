import { supabase } from './supabase'

/**
 * Authenticated fetch — automatically attaches the current session's
 * access token as a Bearer header. Throws if not signed in.
 */
export async function apiFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    },
  })
}
