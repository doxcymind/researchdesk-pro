'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { openRazorpayCheckout } from '@/lib/hooks/useRazorpay'

const cinzel = "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif"
const inter  = "var(--font-inter), 'DM Sans', system-ui, sans-serif"

export default function SettingsPage() {
  const { isScholar, plan } = useSubscription()
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const handleUpgrade = async () => {
    setCheckoutLoading(true)
    await openRazorpayCheckout()
    setCheckoutLoading(false)
  }

  const [userId, setUserId]       = useState('')
  const [apiKey, setApiKey]       = useState('')
  const [savedUserId, setSavedUserId] = useState('')
  const [savedApiKey, setSavedApiKey] = useState('')
  const [status, setStatus]       = useState<'idle' | 'verifying' | 'connected' | 'error'>('idle')
  const [errorMsg, setErrorMsg]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [saveMsg, setSaveMsg]     = useState('')
  const [user, setUser]           = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      // Load saved Zotero creds from user_metadata or profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('zotero_user_id, zotero_api_key')
        .eq('id', user.id)
        .single()
      if (profile) {
        setSavedUserId(profile.zotero_user_id || '')
        setSavedApiKey(profile.zotero_api_key || '')
        setUserId(profile.zotero_user_id || '')
        setApiKey(profile.zotero_api_key || '')
        if (profile.zotero_user_id && profile.zotero_api_key) setStatus('connected')
      }
    }
    load()
  }, [])

  const verify = async () => {
    if (!userId.trim() || !apiKey.trim()) return
    setStatus('verifying')
    setErrorMsg('')
    try {
      const res = await fetch('/api/zotero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', userId: userId.trim(), apiKey: apiKey.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus('connected')
        // Save to profiles table
        setSaving(true)
        await supabase.from('profiles').upsert({
          id: user.id,
          zotero_user_id: userId.trim(),
          zotero_api_key: apiKey.trim(),
        })
        setSavedUserId(userId.trim())
        setSavedApiKey(apiKey.trim())
        setSaving(false)
        setSaveMsg('Connected & saved!')
        setTimeout(() => setSaveMsg(''), 3000)
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Could not connect. Check your User ID and API key.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error. Please try again.')
    }
  }

  const disconnect = async () => {
    setStatus('idle')
    setUserId('')
    setApiKey('')
    setSavedUserId('')
    setSavedApiKey('')
    await supabase.from('profiles').upsert({
      id: user.id,
      zotero_user_id: null,
      zotero_api_key: null,
    })
  }

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

        {/* Zotero Card */}
        <div style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${status === 'connected' ? 'rgba(52,211,153,0.25)' : status === 'error' ? 'rgba(248,113,113,0.25)' : 'rgba(201,148,58,0.15)'}`, borderRadius: 20, overflow: 'hidden', transition: 'border-color 0.3s' }}>
          {/* Card top bar */}
          <div style={{ height: 2, background: status === 'connected' ? 'linear-gradient(90deg, transparent, rgba(52,211,153,0.5), transparent)' : 'linear-gradient(90deg, transparent, rgba(201,148,58,0.4), transparent)' }}/>

          <div style={{ padding: '28px 30px' }}>
            {/* Zotero branding row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(201,86,54,0.12)', border: '1px solid rgba(201,86,54,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                  Z
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#f0e8d0', margin: '0 0 3px', fontFamily: cinzel }}>Zotero</p>
                  <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.4)', margin: 0 }}>Reference manager · zotero.org</p>
                </div>
              </div>
              {status === 'connected' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }}/>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', letterSpacing: '0.06em' }}>CONNECTED</span>
                </div>
              )}
            </div>

            <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.5)', lineHeight: 1.75, margin: '0 0 24px' }}>
              Import references from your Zotero library directly into the Citation Generator. Browse collections, search your library, and add citations in one click.
            </p>

            {status === 'connected' ? (
              <div>
                <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)', marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: 'rgba(52,211,153,0.8)', margin: '0 0 4px', fontWeight: 600 }}>✓ Library connected</p>
                  <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0 }}>User ID: {savedUserId} · API key ending in …{savedApiKey.slice(-4)}</p>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.4)', margin: '0 0 16px' }}>
                  Your Zotero library is now available inside the <strong style={{ color: '#c9943a' }}>Citation Generator</strong> in any project workspace.
                </p>
                <button
                  onClick={disconnect}
                  style={{ padding: '9px 20px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', color: 'rgba(248,113,113,0.7)', fontFamily: inter, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.12)'; e.currentTarget.style.color = '#f87171' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.07)'; e.currentTarget.style.color = 'rgba(248,113,113,0.7)' }}
                >
                  Disconnect Zotero
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* How to get credentials */}
                <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(201,148,58,0.04)', border: '1px solid rgba(201,148,58,0.12)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>How to connect</p>
                  <ol style={{ fontSize: 12, color: 'rgba(240,232,208,0.45)', margin: 0, paddingLeft: 16, lineHeight: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <li>Log in at <a href="https://www.zotero.org/settings/keys" target="_blank" rel="noreferrer" style={{ color: '#c9943a' }}>zotero.org/settings/keys</a></li>
                    <li>Click <strong style={{ color: '#f0e8d0' }}>Create new private key</strong> → enable Library access (read only)</li>
                    <li>Your <strong style={{ color: '#f0e8d0' }}>User ID</strong> is shown above the key list</li>
                    <li>Paste both below and click Connect</li>
                  </ol>
                </div>

                <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 7 }}>User ID</label>
                    <input
                      type="text"
                      value={userId}
                      onChange={e => setUserId(e.target.value)}
                      placeholder="e.g. 1234567"
                      style={{ width: '100%', padding: '11px 13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#f0e8d0', outline: 'none', fontFamily: inter, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 7 }}>API Key</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder="Your private API key"
                      style={{ width: '100%', padding: '11px 13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#f0e8d0', outline: 'none', fontFamily: inter, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                </div>

                {status === 'error' && (
                  <p style={{ fontSize: 12, color: '#f87171', margin: 0, padding: '10px 14px', background: 'rgba(248,113,113,0.06)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)' }}>
                    ✕ {errorMsg}
                  </p>
                )}

                {saveMsg && (
                  <p style={{ fontSize: 12, color: '#34d399', margin: 0 }}>✓ {saveMsg}</p>
                )}

                <button
                  onClick={verify}
                  disabled={status === 'verifying' || !userId.trim() || !apiKey.trim()}
                  style={{
                    padding: '13px', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: (!userId.trim() || !apiKey.trim()) ? 'not-allowed' : 'pointer',
                    background: (!userId.trim() || !apiKey.trim()) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #c9943a, #e8b84a)',
                    color: (!userId.trim() || !apiKey.trim()) ? 'rgba(240,232,208,0.2)' : '#080c18',
                    border: 'none', fontFamily: inter, transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {status === 'verifying' ? (
                    <><span style={{ width: 14, height: 14, border: '2px solid rgba(8,12,24,0.3)', borderTopColor: '#080c18', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/> Verifying…</>
                  ) : saving ? (
                    'Saving…'
                  ) : (
                    '✦ Connect Zotero Library'
                  )}
                </button>
              </div>
            )}
          </div>
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
              <button onClick={handleUpgrade} disabled={checkoutLoading} style={{ padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg, #c9943a, #e8b84a)', color: '#080c18', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: inter }}>
                {checkoutLoading ? '…' : '✦ Upgrade to Scholar — ₹499/mo'}
              </button>
            )}
          </div>
        </div>

        {/* More integrations coming soon */}
        <div style={{ marginTop: 24, padding: '20px 24px', borderRadius: 16, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 20, opacity: 0.3 }}>🔮</div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,232,208,0.3)', margin: '0 0 3px' }}>More integrations coming soon</p>
            <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.2)', margin: 0 }}>PubMed, Mendeley, Google Scholar, Endnote</p>
          </div>
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
