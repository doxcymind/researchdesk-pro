'use client'

import { useState } from 'react'
import { openRazorpayCheckout } from '@/lib/hooks/useRazorpay'
import { apiFetch } from '@/lib/api-fetch'

interface UpgradeModalProps {
  feature: string
  onClose: () => void
}

export default function UpgradeModal({ feature, onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null)

  const handleRestore = async () => {
    setRestoring(true); setRestoreMsg(null)
    try {
      const res = await apiFetch('/api/razorpay/activate', { method: 'POST' })
      const data = await res.json()
      if (data?.success) {
        setRestoreMsg('✓ Access restored! Reloading…')
        setTimeout(() => window.location.reload(), 1200)
      } else {
        setRestoreMsg('No active subscription found for your account. Please subscribe below.')
      }
    } catch {
      setRestoreMsg('Could not reach server. Please try again.')
    } finally {
      setRestoring(false)
    }
  }

  const inter = "var(--font-inter),'DM Sans',system-ui,sans-serif"
  const cinzel = "var(--font-cinzel),'Cormorant Garamond',Georgia,serif"

  const handleUpgrade = async () => {
    setLoading(true)
    setPaymentError(null)
    await openRazorpayCheckout(undefined, (msg) => setPaymentError(msg))
    setLoading(false)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d1120', border: '1px solid rgba(201,148,58,0.3)',
          borderRadius: 20, padding: '36px 32px', maxWidth: 440, width: '100%',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(201,148,58,0.08)',
          position: 'relative',
        }}
      >
        {/* Top gold line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, borderRadius: '20px 20px 0 0', background: 'linear-gradient(90deg, transparent, #c9943a, transparent)' }}/>

        {/* Icon */}
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(201,148,58,0.1)', border: '1px solid rgba(201,148,58,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 20 }}>✦</div>

        <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px', fontWeight: 700, fontFamily: inter }}>Scholar Plan</p>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: '#f0e8d0', margin: '0 0 10px', fontFamily: cinzel, lineHeight: 1.3 }}>
          Unlock {feature}
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(240,232,208,0.45)', margin: '0 0 24px', lineHeight: 1.65, fontFamily: inter }}>
          Try Scholar free for 7 days. Unlimited projects, AI review, citations and more. ₹499/mo after trial.
        </p>

        {/* Features list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {[
            '✦ AI Draft Generation — write any section instantly',
            '✦ AI Peer Review — get editor-level feedback',
            '✦ AI Research Assistant — chat with your manuscript',
            '✦ MeSH Keyword Suggestions',
            '✦ Unlimited projects',
          ].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'rgba(240,232,208,0.6)', fontFamily: inter }}>
              {f}
            </div>
          ))}
        </div>

        {paymentError && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontSize: 12, marginBottom: 12, fontFamily: inter }}>
            {paymentError}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12,
            background: loading ? 'rgba(201,148,58,0.3)' : 'linear-gradient(135deg, #c9943a, #e8b84a)',
            color: '#080c18', fontSize: 14, fontWeight: 700,
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: inter, marginBottom: 12,
          }}
        >
          {loading ? 'Opening payment…' : 'Start 7-day Free Trial — ₹499/month after'}
        </button>

        <p style={{ fontSize: 11.5, color: 'rgba(240,232,208,0.3)', textAlign: 'center', margin: '0 0 10px', lineHeight: 1.6, fontFamily: inter }}>
          🔒 A refundable ₹5 will verify your payment method. <strong style={{ color: 'rgba(240,232,208,0.45)' }}>First ₹499 charge on {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.</strong> Cancel anytime.
        </p>

        <button
          onClick={onClose}
          style={{ width: '100%', padding: '10px 0', borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(240,232,208,0.35)', fontSize: 13, cursor: 'pointer', fontFamily: inter }}
        >
          Maybe later
        </button>

        {/* Restore access for users who already paid */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          {restoreMsg ? (
            <p style={{ fontSize: 12, color: restoreMsg.startsWith('✓') ? '#4ade80' : '#f87171', margin: 0, fontFamily: inter }}>{restoreMsg}</p>
          ) : (
            <button
              onClick={handleRestore}
              disabled={restoring}
              style={{ background: 'none', border: 'none', cursor: restoring ? 'not-allowed' : 'pointer', fontSize: 12, color: 'rgba(240,232,208,0.25)', fontFamily: inter, textDecoration: 'underline', padding: 0 }}
            >
              {restoring ? 'Checking…' : 'Already subscribed? Restore access'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
