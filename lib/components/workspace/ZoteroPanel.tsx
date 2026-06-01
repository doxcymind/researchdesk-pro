'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const inter = "var(--font-inter),'DM Sans',system-ui,sans-serif"
const cinzel = "var(--font-cinzel),'Cormorant Garamond',Georgia,serif"

export default function ZoteroPanel() {
  const [userId, setUserId]         = useState('')
  const [apiKey, setApiKey]         = useState('')
  const [savedUserId, setSavedUserId] = useState('')
  const [savedApiKey, setSavedApiKey] = useState('')
  const [status, setStatus]         = useState<'idle' | 'verifying' | 'connected' | 'error'>('idle')
  const [errorMsg, setErrorMsg]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [saveMsg, setSaveMsg]       = useState('')
  const [user, setUser]             = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return
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
    <div style={{ fontFamily: inter }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 700 }}>
          ✦ &nbsp; Tools
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(201,86,54,0.12)', border: '1px solid rgba(201,86,54,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#c95636', flexShrink: 0 }}>Z</div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: '#f0e8d0', margin: 0, fontFamily: cinzel }}>Zotero</h2>
            <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.4)', margin: 0 }}>Reference manager · zotero.org</p>
          </div>
          {status === 'connected' && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', letterSpacing: '0.06em' }}>CONNECTED</span>
            </div>
          )}
        </div>
        <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.45)', lineHeight: 1.75, margin: 0 }}>
          Import references from your Zotero library directly into the Citation Generator. Browse collections, search your library, and add citations in one click.
        </p>
        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(201,148,58,0.3), transparent)', marginTop: 20 }} />
      </div>

      {/* Connected state */}
      {status === 'connected' ? (
        <div>
          <div style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'rgba(52,211,153,0.85)', margin: '0 0 4px', fontWeight: 600 }}>✓ Library connected</p>
            <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0 }}>
              User ID: {savedUserId} · API key ending in …{savedApiKey.slice(-4)}
            </p>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.45)', lineHeight: 1.7, marginBottom: 20 }}>
            Your Zotero library is now available inside the <strong style={{ color: '#c9943a' }}>Citation Generator</strong>. Switch to it from the sidebar to browse and import references.
          </p>
          <button
            onClick={disconnect}
            style={{ padding: '10px 22px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', color: 'rgba(248,113,113,0.7)', fontFamily: inter, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.12)'; e.currentTarget.style.color = '#f87171' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.07)'; e.currentTarget.style.color = 'rgba(248,113,113,0.7)' }}
          >
            Disconnect Zotero
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* How to connect */}
          <div style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(201,148,58,0.04)', border: '1px solid rgba(201,148,58,0.12)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>How to connect</p>
            <ol style={{ fontSize: 12, color: 'rgba(240,232,208,0.45)', margin: 0, paddingLeft: 18, lineHeight: 2.1 }}>
              <li>Log in at <a href="https://www.zotero.org/settings/keys" target="_blank" rel="noreferrer" style={{ color: '#c9943a' }}>zotero.org/settings/keys</a></li>
              <li>Click <strong style={{ color: '#f0e8d0' }}>Create new private key</strong> → enable Library access (read only)</li>
              <li>Your <strong style={{ color: '#f0e8d0' }}>User ID</strong> is shown above the key list</li>
              <li>Paste both below and click Connect</li>
            </ol>
          </div>

          {/* Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 7 }}>User ID</label>
              <input
                type="text" value={userId} onChange={e => setUserId(e.target.value)}
                placeholder="e.g. 1234567"
                style={{ width: '100%', padding: '11px 13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#f0e8d0', outline: 'none', fontFamily: inter, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 7 }}>API Key</label>
              <input
                type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder="Your private API key"
                style={{ width: '100%', padding: '11px 13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#f0e8d0', outline: 'none', fontFamily: inter, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>
          </div>

          {status === 'error' && (
            <p style={{ fontSize: 12, color: '#f87171', margin: 0, padding: '10px 14px', background: 'rgba(248,113,113,0.06)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)' }}>✕ {errorMsg}</p>
          )}
          {saveMsg && <p style={{ fontSize: 12, color: '#34d399', margin: 0 }}>✓ {saveMsg}</p>}

          <button
            onClick={verify}
            disabled={status === 'verifying' || !userId.trim() || !apiKey.trim()}
            style={{
              padding: '13px', borderRadius: 11, fontSize: 13, fontWeight: 700,
              cursor: (!userId.trim() || !apiKey.trim()) ? 'not-allowed' : 'pointer',
              background: (!userId.trim() || !apiKey.trim()) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #c9943a, #e8b84a)',
              color: (!userId.trim() || !apiKey.trim()) ? 'rgba(240,232,208,0.2)' : '#080c18',
              border: 'none', fontFamily: inter, transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {status === 'verifying' ? (
              <><span style={{ width: 14, height: 14, border: '2px solid rgba(8,12,24,0.3)', borderTopColor: '#080c18', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Verifying…</>
            ) : saving ? 'Saving…' : '✦ Connect Zotero Library'}
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
