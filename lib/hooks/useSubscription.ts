'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type Plan = 'free' | 'scholar' | 'past_due'

// Team / admin accounts — always get full Scholar access
const TEAM_EMAILS = [
  'nechmed0080@gmail.com',
  'gaur.gsvm@gmail.com',
  'pheonixfire968@gmail.com',
  'drsparshdixit@gmail.com',
]

export function useSubscription() {
  const [plan, setPlan] = useState<Plan>('free')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      // Team accounts always have Scholar access — no DB lookup needed
      if (user.email && TEAM_EMAILS.includes(user.email.toLowerCase())) {
        setPlan('scholar')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('subscription_status, cashfree_subscription_id')
        .eq('id', user.id)
        .single()

      const status = (data?.subscription_status as Plan) || 'free'

      // Auto-activate: if user has a subscription ID but status isn't scholar yet,
      // call the activate endpoint to verify with Cashfree and fix the status
      if (status !== 'scholar' && data?.cashfree_subscription_id) {
        try {
          const token = session.access_token
          const res = await fetch('/api/cashfree/activate', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) { setPlan('scholar'); return }
        } catch {}
      }

      setPlan(status)
    } catch {
      // fail silently — default to free plan
    } finally {
      setLoading(false)
    }
  }, [])

  // Run on mount
  useEffect(() => { load() }, [load])

  // Re-check when tab becomes visible again (e.g. user returns after paying)
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [load])

  const isScholar = plan === 'scholar'
  const projectLimit = isScholar ? Infinity : 3

  return { plan, loading, isScholar, projectLimit }
}
