'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * Auto-logout for Google OAuth users when the browser/tab is closed.
 *
 * sessionStorage is cleared automatically when the browser closes (unlike localStorage).
 * On each page load we check for a 'rd_tab' key:
 *   - Not present → browser was just opened fresh → sign out Google users
 *   - Present     → page was refreshed / navigated to → keep session alive
 */
export function useSessionGuard() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const tabOpen = sessionStorage.getItem('rd_tab')

      if (!tabOpen) {
        // Fresh browser open — check if logged in via Google and sign out
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const provider = session.user?.app_metadata?.provider
          if (provider === 'google') {
            await supabase.auth.signOut()
            router.replace('/')
            return
          }
        }
      }

      // Mark tab as open for this browser session
      sessionStorage.setItem('rd_tab', '1')
    }

    run()
  }, [])
}
