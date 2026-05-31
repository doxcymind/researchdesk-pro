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

export async function openRazorpayCheckout(onSuccess?: () => void): Promise<void> {
  try {
  const loaded = await loadRazorpayScript()
  if (!loaded) { alert('Failed to load payment gateway. Please try again.'); return }

  // Create order on backend
  const res = await apiFetch('/api/razorpay/order', { method: 'POST' })
  const order = await res.json()
  if (order.error) { alert(order.error === 'Unauthorized' ? 'Please log in to upgrade.' : order.error); return }

  const options = {
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    name: 'ResearchDesk',
    description: 'Scholar Plan — ₹499/month',
    image: '/logo.webp',
    order_id: order.orderId,
    handler: async (response: any) => {
      // Verify payment on backend
      const verifyRes = await apiFetch('/api/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }),
      })
      const verifyData = await verifyRes.json()
      if (verifyData.success) {
        onSuccess?.()
        window.location.href = '/dashboard?upgraded=1'
      } else {
        alert('Payment verification failed. Please contact support.')
      }
    },
    prefill: { email: '' },
    theme: { color: '#c9943a' },
    modal: { ondismiss: () => {} },
  }

  const rzp = new window.Razorpay(options)
  rzp.open()
  } catch (e: any) {
    console.error('Razorpay error:', e)
    alert('Payment error: ' + (e?.message || String(e)))
  }
}
