'use client'

import { apiFetch } from '@/lib/api-fetch'
import { load } from '@cashfreepayments/cashfree-js'
import { promptForPhone } from '@/lib/components/PhonePrompt'

export async function openCashfreeCheckout(
  onSuccess?: () => void,
  onError?: (msg: string) => void,
): Promise<void> {
  const reportError = (msg: string) => { onError?.(msg) }

  // Skip payment on localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    reportError('Payments are disabled on localhost. Use the live site to subscribe.')
    return
  }

  try {
    // Create subscription on backend (7-day trial, then ₹499/month).
    const createSubscription = (phone?: string) =>
      apiFetch('/api/cashfree/subscribe', {
        method: 'POST',
        body: JSON.stringify({ returnPath: window.location.pathname, phone }),
      }).then(r => r.json())

    let sub = await createSubscription()

    // Cashfree needs a mobile for the mandate — collect it and retry once.
    if (sub?.error === 'PHONE_REQUIRED') {
      const phone = await promptForPhone()
      if (!phone) return // user cancelled
      sub = await createSubscription(phone)
    }

    if (sub?.error) {
      reportError(sub.error === 'Unauthorized' ? 'Please log in to upgrade.' : `Error: ${sub.error}`)
      return
    }
    if (!sub?.subscriptionSessionId) {
      reportError('Payment gateway not configured. Please contact support.')
      return
    }

    const cashfree = await load({ mode: sub.mode === 'production' ? 'production' : 'sandbox' })

    // Redirects to Cashfree's hosted authorization page. On completion the user
    // returns to subscription_meta.return_url, where useSubscription auto-activates.
    cashfree.subscriptionsCheckout({
      subsSessionId: sub.subscriptionSessionId,
      redirectTarget: '_self',
    })

    onSuccess?.()
  } catch (e: any) {
    reportError('Payment error: ' + (e?.message || String(e)))
  }
}
