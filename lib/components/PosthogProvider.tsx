'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPosthog, posthog } from '@/lib/posthog'

function PosthogPageview() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    initPosthog()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
      posthog.capture('$pageview', { $current_url: window.location.origin + url })
    }
  }, [pathname, searchParams])

  return null
}

export default function PosthogProvider() {
  return (
    <Suspense fallback={null}>
      <PosthogPageview />
    </Suspense>
  )
}
