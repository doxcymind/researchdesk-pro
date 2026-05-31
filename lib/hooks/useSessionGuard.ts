'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * Auto-logout for Google OAuth users when the browser/tab is closed.
 *
 * sessionStorage is cleared when the browser closes (unlike localStorage).
 * On each page load:
 *   - If 'rd_tab' is present → in-session navigation or refresh → keep going
 *   - If not present → either browser reopen OR fresh login
 *     → distinguish via session creation time: if session was created < 2 min ago
 *       it's a fresh login, so just set the flag. Otherwise sign out.
 */
export function useSessionGuard() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const tabOpen = sessionStorage.getItem('rd_tab')

      if (!tabOpen) {
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          const provider = session.user?.app_metadata?.provider
          if (provider === 'google') {
            // If the session was created in the last 2 minutes it's a fresh login — allow it
            const createdAt = new Date(session.user.created_at ?? 0).getTime()
            const lastSignIn = new Date(session.user.last_sign_in_at ?? 0).getTime()
            const recentLogin = (Date.now() - Math.max(createdAt, lastSignIn)) < 2 * 60 * 1000

            if (!recentLogin) {
              // Browser was reopened with a stale session → sign out
              await supabase.auth.signOut()
              router.replace('/')
              return
            }
          }
        }
      }

      // Mark tab as open for this browser session
      sessionStorage.setItem('rd_tab', '1')
    }

    run()
  }, [])
}
