'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const cinzel = "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif"
const inter  = "var(--font-inter), 'DM Sans', system-ui, sans-serif"

const COMING_SOON = [
  {
    icon: '🔬',
    name: 'PubMed',
    sub: 'Literature database · pubmed.ncbi.nlm.nih.gov',
    desc: 'Search 35M+ biomedical citations and abstracts. Import references directly into your manuscript with one click.',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.18)',
  },
  {
    icon: '📚',
    name: 'Mendeley',
    sub: 'Reference manager · mendeley.com',
    desc: 'Sync your Mendeley library and access your saved papers, annotations, and collections inside ResearchDesk.',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.18)',
  },
  {
    icon: '🎓',
    name: 'Google Scholar',
    sub: 'Academic search · scholar.google.com',
    desc: 'Pull citations, citation counts, and related articles from Google Scholar without leaving your workspace.',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.18)',
  },
  {
    icon: '📖',
    name: 'EndNote',
    sub: 'Reference manager · endnote.com',
    desc: 'Import your EndNote library and sync references across projects. Supports X9 and EndNote 20+.',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.18)',
  },
  {
    icon: '🧬',
    name: 'ORCID',
    sub: 'Researcher identity · orcid.org',
    desc: 'Link your ORCID iD to auto-fill author details and track your publications across all your manuscripts.',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.18)',
  },
  {
    icon: '🏥',
    name: 'ClinicalTrials.gov',
    sub: 'Trial registry · clinicaltrials.gov',
    desc: 'Fetch trial registration details directly into your Methods section with the correct NCT number and protocol.',
    color: '#e879f9',
    bg: 'rgba(232,121,249,0.08)',
    border: 'rgba(232,121,249,0.18)',
  },
]

export default function ToolsPage() {
  const router = useRouter()
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
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.push('/login'); return }
      setUser(user)
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
        setSaving(true)
        await supabase.from('profiles').upsert({ id: user.id, zotero_user_id: userId.trim(), zotero_api_key: apiKey.trim() })
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
    await supabase.from('profiles').upsert({ id: user.id, zotero_user_id: null, zotero_api_key: null })
  }

  return (
    <div style={{ background: '#080c18', minHeight: '100vh', color: '#f0e8d0', fontFamily: inter }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(201,148,58,0.15)', padding: '18px 56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,8,15,0.8)', backdropFilter: 'blur(20px)', borderTop: '2px solid rgba(201,148,58,0.5)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.webp" alt="R" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}/>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: cinzel, letterSpacing: '0.03em' }}>
            <span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span>
          </span>
        </Link>
        <Link href="/dashboard" style={{ fontSize: 12, color: 'rgba(201,148,58,0.6)', textDecoration: 'none', letterSpacing: '0.06em' }}>← Back to Dashboard</Link>
      </nav>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(24px, 5vw, 64px) clamp(16px, 5vw, 40px)' }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12, fontFamily: cinzel }}>✦ &nbsp; Integrations</p>
          <h1 style={{ fontSize: 38, fontWeight: 600, color: '#f0e8d0', margin: '0 0 10px', fontFamily: cinzel, lineHeight: 1.1 }}>Tools & Integrations</h1>
          <p style={{ fontSize: 14, color: 'rgba(240,232,208,0.4)', margin: 0, lineHeight: 1.7 }}>
            Connect your existing research tools to ResearchDesk. Import references, sync libraries, and streamline your workflow without switching apps.
          </p>
          <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(201,148,58,0.35), transparent)', marginTop: 24 }}/>
        </div>

        {/* ── ACTIVE TOOLS ── */}
        <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 16 }}>Active</p>

        {/* Zotero Card */}
        <div style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${status === 'connected' ? 'rgba(52,211,153,0.25)' : status === 'error' ? 'rgba(248,113,113,0.25)' : 'rgba(201,148,58,0.15)'}`, borderRadius: 20, overflow: 'hidden', marginBottom: 40, transition: 'border-color 0.3s' }}>
          <div style={{ height: 2, background: status === 'connected' ? 'linear-gradient(90deg, transparent, rgba(52,211,153,0.5), transparent)' : 'linear-gradient(90deg, transparent, rgba(201,148,58,0.4), transparent)' }}/>
          <div style={{ padding: '28px 30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 13, background: 'rgba(201,86,54,0.12)', border: '1px solid rgba(201,86,54,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#c95636' }}>Z</div>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#f0e8d0', margin: '0 0 3px', fontFamily: cinzel }}>Zotero</p>
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

            <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.5)', lineHeight: 1.75, margin: '0 0 22px' }}>
              Import references from your Zotero library directly into the Citation Generator. Browse collections, search your library, and add citations in one click.
            </p>

            {status === 'connected' ? (
              <div>
                <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)', marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: 'rgba(52,211,153,0.8)', margin: '0 0 4px', fontWeight: 600 }}>✓ Library connected</p>
                  <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0 }}>User ID: {savedUserId} · API key ending in …{savedApiKey.slice(-4)}</p>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.4)', margin: '0 0 16px' }}>
                  Your Zotero library is available inside the <strong style={{ color: '#c9943a' }}>Citation Generator</strong> in any project workspace.
                </p>
                <button onClick={disconnect} style={{ padding: '9px 20px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', color: 'rgba(248,113,113,0.7)', fontFamily: inter, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(248,113,113,0.12)'; e.currentTarget.style.color='#f87171' }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(248,113,113,0.07)'; e.currentTarget.style.color='rgba(248,113,113,0.7)' }}
                >Disconnect Zotero</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(201,148,58,0.04)', border: '1px solid rgba(201,148,58,0.12)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>How to connect</p>
                  <ol style={{ fontSize: 12, color: 'rgba(240,232,208,0.45)', margin: 0, paddingLeft: 16, lineHeight: 2 }}>
                    <li>Log in at <a href="https://www.zotero.org/settings/keys" target="_blank" rel="noreferrer" style={{ color: '#c9943a' }}>zotero.org/settings/keys</a></li>
                    <li>Click <strong style={{ color: '#f0e8d0' }}>Create new private key</strong> → enable Library access (read only)</li>
                    <li>Your <strong style={{ color: '#f0e8d0' }}>User ID</strong> is shown above the key list</li>
                    <li>Paste both below and click Connect</li>
                  </ol>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 7 }}>User ID</label>
                    <input type="text" value={userId} onChange={e => setUserId(e.target.value)} placeholder="e.g. 1234567"
                      style={{ width: '100%', padding: '11px 13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#f0e8d0', outline: 'none', fontFamily: inter, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                      onFocus={e => (e.target.style.borderColor='rgba(201,148,58,0.4)')}
                      onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.1)')}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 7 }}>API Key</label>
                    <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Your private API key"
                      style={{ width: '100%', padding: '11px 13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#f0e8d0', outline: 'none', fontFamily: inter, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                      onFocus={e => (e.target.style.borderColor='rgba(201,148,58,0.4)')}
                      onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.1)')}
                    />
                  </div>
                </div>

                {status === 'error' && (
                  <p style={{ fontSize: 12, color: '#f87171', margin: 0, padding: '10px 14px', background: 'rgba(248,113,113,0.06)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)' }}>✕ {errorMsg}</p>
                )}
                {saveMsg && <p style={{ fontSize: 12, color: '#34d399', margin: 0 }}>✓ {saveMsg}</p>}

                <button onClick={verify} disabled={status === 'verifying' || !userId.trim() || !apiKey.trim()}
                  style={{ padding: '13px', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: (!userId.trim() || !apiKey.trim()) ? 'not-allowed' : 'pointer', background: (!userId.trim() || !apiKey.trim()) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #c9943a, #e8b84a)', color: (!userId.trim() || !apiKey.trim()) ? 'rgba(240,232,208,0.2)' : '#080c18', border: 'none', fontFamily: inter, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {status === 'verifying' ? (
                    <><span style={{ width: 14, height: 14, border: '2px solid rgba(8,12,24,0.3)', borderTopColor: '#080c18', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/> Verifying…</>
                  ) : saving ? 'Saving…' : '✦ Connect Zotero Library'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── COMING SOON ── */}
        <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.25)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 16 }}>Coming Soon</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {COMING_SOON.map(t => (
            <div key={t.name} style={{ background: 'rgba(255,255,255,0.018)', border: `1px solid ${t.border}`, borderRadius: 18, overflow: 'hidden', position: 'relative', opacity: 0.72, transition: 'opacity 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.72')}
            >
              <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${t.color}55, transparent)` }}/>
              <div style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: t.bg, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{t.icon}</div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#f0e8d0', margin: '0 0 2px', fontFamily: cinzel }}>{t.name}</p>
                      <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: 0 }}>{t.sub}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(240,232,208,0.25)', letterSpacing: '0.1em' }}>SOON</span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', lineHeight: 1.65, margin: 0 }}>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
