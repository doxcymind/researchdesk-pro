'use client'

import { apiFetch } from '@/lib/api-fetch'

declare global {
  interface Window {
    Razorpay: any
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export async function openRazorpayCheckout(
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
    const loaded = await loadRazorpayScript()
    if (!loaded) { reportError('Failed to load payment gateway. Please try again.'); return }

    // Create subscription on backend
    const subRes = await apiFetch('/api/razorpay/subscribe', { method: 'POST' })
    const sub = await subRes.json()
    if (sub?.error) {
      reportError(sub.error === 'Unauthorized' ? 'Please log in to upgrade.' : `Error: ${sub.error}`)
      return
    }
    if (!sub?.keyId) {
      reportError(`Setup error: ${JSON.stringify(sub)}`)
      return
    }

    const options = {
      key: sub.keyId,
      subscription_id: sub.subscriptionId,
      name: 'ResearchDesk Pro',
      description: '7-day free trial, then ₹499/month',
      image: '/logo.webp',
      handler: async (response: any) => {
        // Verify subscription payment
        const verifyRaw = await apiFetch('/api/razorpay/verify-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        })
        const verifyRes = await verifyRaw.json()
        if (verifyRes?.success) {
          onSuccess?.()
          window.location.href = '/dashboard?upgraded=1'
        } else {
          reportError('Verification failed. Please contact support.')
        }
      },
      prefill: { email: sub.email ?? '', name: sub.name ?? '' },
      theme: { color: '#c9943a' },
      modal: { ondismiss: () => {} },
    }

    const rzp = new window.Razorpay(options)
    rzp.open()
  } catch (e: any) {
    reportError('Payment error: ' + (e?.message || String(e)))
  }
}
