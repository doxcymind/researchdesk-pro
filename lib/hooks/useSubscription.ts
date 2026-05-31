'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type Plan = 'free' | 'scholar' | 'past_due'

const WHITELISTED_EMAILS = [
  'nechmed0080@gmail.com',
  'gaur.gsvm@gmail.com',
]

export function useSubscription() {
  const [plan, setPlan] = useState<Plan>('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Whitelisted emails always get Scholar access
      if (user.email && WHITELISTED_EMAILS.includes(user.email.toLowerCase())) {
        setPlan('scholar')
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single()

      setPlan((data?.subscription_status as Plan) || 'free')
      setLoading(false)
    }
    load()
  }, [])

  const isScholar = plan === 'scholar'
  const projectLimit = isScholar ? Infinity : 3

  return { plan, loading, isScholar, projectLimit }
}
