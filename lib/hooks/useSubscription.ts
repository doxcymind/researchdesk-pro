'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type Plan = 'free' | 'scholar' | 'past_due'

// Team / admin accounts — always get full Scholar access
const TEAM_EMAILS = [
  'nechmed0080@gmail.com',
  'gaur.gsvm@gmail.com',
  'pheonixfire968@gmail.com',
  'itsthetimemsd@gmail.com',
]

export function useSubscription() {
  const [plan, setPlan] = useState<Plan>('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
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
          .select('subscription_status')
          .eq('id', user.id)
          .single()

        setPlan((data?.subscription_status as Plan) || 'free')
      } catch {
        // fail silently — default to free plan
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const isScholar = plan === 'scholar'
  const projectLimit = isScholar ? Infinity : 3

  return { plan, loading, isScholar, projectLimit }
}
