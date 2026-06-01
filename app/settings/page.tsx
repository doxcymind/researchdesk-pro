'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { openRazorpayCheckout } from '@/lib/hooks/useRazorpay'

const cinzel = "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif"
const inter  = "var(--font-inter), 'DM Sans', system-ui, sans-serif"

export default function SettingsPage() {
  const router = useRouter()
  const { isScholar, plan } = useSubscription()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const handleUpgrade = async () => {
    setCheckoutLoading(true)
    setPaymentError(null)
    await openRazorpayCheckout(undefined, (msg) => setPaymentError(msg))
    setCheckoutLoading(false)
  }

  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const u = session?.user
      if (!u) { router.push('/login'); return }
      setUser(u)
    }
    load()
  }, [])

  return (
    <div style={{ background: '#080c18', minHeight: '100vh', color: '#f0e8d0', fontFamily: inter }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(201,148,58,0.15)', padding: '18px 56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,8,15,0.8)', backdropFilter: 'blur(20px)', borderTop: '2px solid rgba(201,148,58,0.5)' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.webp" alt="R" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}/>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: cinzel, letterSpacing: '0.03em' }}>
            <span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span>
          </span>
        </Link>
        <Link href="/dashboard" style={{ fontSize: 12, color: 'rgba(201,148,58,0.6)', textDecoration: 'none', letterSpacing: '0.06em' }}>← Back to Dashboard</Link>
      </nav>

      <main style={{ maxWidth: 700, margin: '0 auto', padding: 'clamp(24px, 5vw, 64px) clamp(16px, 5vw, 40px)' }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12, fontFamily: cinzel }}>✦ &nbsp; Settings</p>
          <h1 style={{ fontSize: 38, fontWeight: 600, color: '#f0e8d0', margin: '0 0 10px', fontFamily: cinzel, lineHeight: 1.1 }}>Integrations</h1>
          <p style={{ fontSize: 14, color: 'rgba(240,232,208,0.4)', margin: 0, lineHeight: 1.7 }}>Connect external tools to supercharge your research workflow.</p>
          <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(201,148,58,0.35), transparent)', marginTop: 24 }}/>
        </div>

        {/* Tools link */}
        <div style={{ marginBottom: 24, padding: '18px 22px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,148,58,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#f0e8d0', margin: '0 0 3px' }}>🔧 Tools & Integrations</p>
            <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0 }}>Connect Zotero, PubMed, Mendeley and more</p>
          </div>
          <Link href="/tools" style={{ fontSize: 12, fontWeight: 700, color: '#c9943a', textDecoration: 'none', padding: '8px 18px', borderRadius: 9, border: '1px solid rgba(201,148,58,0.25)', background: 'rgba(201,148,58,0.07)', whiteSpace: 'nowrap' }}
            onMouseEnter={e => (e.currentTarget.style.background='rgba(201,148,58,0.14)')}
            onMouseLeave={e => (e.currentTarget.style.background='rgba(201,148,58,0.07)')}
          >Open Tools →</Link>
        </div>


        {/* Billing Card */}
        <div style={{ marginTop: 24, padding: '28px 28px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,148,58,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 6px', fontWeight: 700 }}>Subscription</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#f0e8d0', fontFamily: cinzel }}>
                  {isScholar ? 'Scholar' : 'Free'}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  background: isScholar ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)',
                  color: isScholar ? '#34d399' : 'rgba(240,232,208,0.4)',
                  border: isScholar ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.08)',
                }}>
                  {isScholar ? '✓ ACTIVE' : 'FREE PLAN'}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: '6px 0 0' }}>
                {isScholar ? 'Unlimited projects · All AI features · Priority support' : '3 projects · Basic AI features'}
              </p>
            </div>
            {isScholar ? (
              <span style={{ fontSize: 13, color: 'rgba(240,232,208,0.4)', fontStyle: 'italic' }}>Active — renews monthly</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                <button onClick={handleUpgrade} disabled={checkoutLoading} style={{ padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg, #c9943a, #e8b84a)', color: '#080c18', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: inter }}>
                  {checkoutLoading ? '…' : '✦ Upgrade to Scholar — ₹499/mo'}
                </button>
                {paymentError && (
                  <span style={{ fontSize: 12, color: '#f87171' }}>{paymentError}</span>
                )}
              </div>
            )}
          </div>
        </div>

      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
