'use client'
import { apiFetch } from '@/lib/api-fetch'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const inter = "var(--font-inter), 'DM Sans', system-ui, sans-serif"
const cinzel = "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif"
const STYLES = ['Vancouver', 'APA', 'AMA', 'Harvard', 'MLA']

interface ZoteroItem {
  key: string
  data: {
    title: string; itemType: string
    creators?: { firstName?: string; lastName?: string; name?: string }[]
    date?: string; publicationTitle?: string; journalAbbreviation?: string
    volume?: string; issue?: string; pages?: string; DOI?: string; url?: string
    publisher?: string; place?: string
  }
}
interface ZoteroCollection { key: string; data: { name: string; parentCollection?: string } }
interface Citation { text: string; style: string; input: string }

function zoteroToRefString(item: ZoteroItem): string {
  const d = item.data
  const authors = (d.creators || []).map(c => c.lastName ? `${c.lastName} ${(c.firstName||'').charAt(0)}` : c.name||'').filter(Boolean).join(', ')
  const year = d.date ? d.date.slice(0, 4) : ''
  return [authors, d.title, d.publicationTitle || d.publisher, year, d.volume, d.pages, d.DOI ? `DOI:${d.DOI}` : ''].filter(Boolean).join('. ')
}

export default function CitationGenerator({ projectId }: { projectId?: number }) {
  const [tab, setTab]                   = useState<'manual' | 'zotero'>('manual')
  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [citations, setCitations]       = useState<Citation[]>([])
  const [copiedIndex, setCopiedIndex]   = useState<number | null>(null)
  const [copiedAll, setCopiedAll]       = useState(false)
  const [selectedStyle, setSelectedStyle] = useState('Vancouver')
  const [saving, setSaving]             = useState(false)
  const saveTimeout                     = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Zotero connected state
  const [zoteroUserId, setZoteroUserId] = useState<string | null>(null)
  const [zoteroApiKey, setZoteroApiKey] = useState<string | null>(null)

  // Zotero library state
  const [collections, setCollections]   = useState<ZoteroCollection[]>([])
  const [zItems, setZItems]             = useState<ZoteroItem[]>([])
  const [selectedCollection, setSelectedCollection] = useState('')
  const [zQuery, setZQuery]             = useState('')
  const [zLoading, setZLoading]         = useState(false)
  const [zError, setZError]             = useState('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [importing, setImporting]       = useState(false)

  // Zotero connect form state
  const [connectUserId, setConnectUserId] = useState('')
  const [connectApiKey, setConnectApiKey] = useState('')
  const [connecting, setConnecting]     = useState(false)
  const [connectError, setConnectError] = useState('')

  // Load creds + saved citations on mount
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('zotero_user_id, zotero_api_key').eq('id', user.id).single()
      if (profile?.zotero_user_id && profile?.zotero_api_key) {
        setZoteroUserId(profile.zotero_user_id)
        setZoteroApiKey(profile.zotero_api_key)
      }

      if (projectId) {
        const { data: row } = await supabase.from('project_sections')
          .select('content').eq('project_id', projectId).eq('user_id', user.id).eq('section', '__citations__').single()
        if (row?.content) {
          try { setCitations(JSON.parse(row.content)) } catch {}
        }
      }
    }
    load()
  }, [projectId])

  // Auto-save citations to DB
  useEffect(() => {
    if (!projectId || citations.length === 0) return
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(async () => {
      setSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { setSaving(false); return }
      await supabase.from('project_sections').upsert(
        { project_id: projectId, user_id: user.id, section: '__citations__', content: JSON.stringify(citations) },
        { onConflict: 'project_id,user_id,section' }
      )
      setSaving(false)
    }, 800)
  }, [citations, projectId])

  // Auto-load library when switching to zotero tab
  useEffect(() => {
    if (tab === 'zotero' && zoteroUserId && zoteroApiKey && collections.length === 0) fetchCollections()
  }, [tab, zoteroUserId, zoteroApiKey])

  const fetchCollections = async () => {
    if (!zoteroUserId || !zoteroApiKey) return
    setZLoading(true); setZError('')
    try {
      const res = await fetch('/api/zotero', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'collections', userId: zoteroUserId, apiKey: zoteroApiKey }) })
      const data = await res.json()
      if (data.collections) setCollections(data.collections)
      await fetchItems('', '')
    } catch { setZError('Network error loading Zotero library') }
    finally { setZLoading(false) }
  }

  const fetchItems = async (collectionKey: string, query: string) => {
    if (!zoteroUserId || !zoteroApiKey) return
    setZLoading(true); setZError('')
    try {
      const res = await fetch('/api/zotero', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'items', userId: zoteroUserId, apiKey: zoteroApiKey, collectionKey, query }) })
      const data = await res.json()
      if (data.items) setZItems(data.items)
      else setZError('Could not load items')
    } catch { setZError('Network error loading items') }
    finally { setZLoading(false) }
  }

  const connectZotero = async () => {
    if (!connectUserId.trim() || !connectApiKey.trim()) return
    setConnecting(true); setConnectError('')
    try {
      const res  = await fetch('/api/zotero', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', userId: connectUserId.trim(), apiKey: connectApiKey.trim() }) })
      const data = await res.json()
      if (data.ok) {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (user) await supabase.from('profiles').upsert({ id: user.id, zotero_user_id: connectUserId.trim(), zotero_api_key: connectApiKey.trim() })
        setZoteroUserId(connectUserId.trim())
        setZoteroApiKey(connectApiKey.trim())
        setConnectUserId(''); setConnectApiKey('')
        // Library will auto-load via useEffect
      } else { setConnectError(data.error || 'Could not connect. Check credentials.') }
    } catch { setConnectError('Network error. Try again.') }
    finally { setConnecting(false) }
  }

  const disconnectZotero = async () => {
    setZoteroUserId(null); setZoteroApiKey(null); setCollections([]); setZItems([]); setTab('manual')
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (user) await supabase.from('profiles').upsert({ id: user.id, zotero_user_id: null, zotero_api_key: null })
  }

  const toggleKey = (key: string) => {
    setSelectedKeys(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  const importSelected = async () => {
    const toImport = zItems.filter(i => selectedKeys.has(i.key))
    if (!toImport.length) return
    setImporting(true)
    for (const item of toImport) {
      try {
        const res  = await apiFetch('/api/citation', { method: 'POST', body: JSON.stringify({ input: zoteroToRefString(item), style: selectedStyle }) })
        const data = await res.json()
        if (data.citation) setCitations(prev => [{ text: data.citation, style: selectedStyle, input: item.data.title || '' }, ...prev])
      } catch {}
    }
    setSelectedKeys(new Set()); setImporting(false); setTab('manual')
  }

  const generateCitation = async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    try {
      const res  = await apiFetch('/api/citation', { method: 'POST', body: JSON.stringify({ input: input.trim(), style: selectedStyle }) })
      const data = await res.json()
      if (data.citation) { setCitations(prev => [{ text: data.citation, style: selectedStyle, input: input.trim() }, ...prev]); setInput('') }
    } catch {}
    finally { setLoading(false) }
  }

  const copy = (text: string, index: number) => {
    navigator.clipboard.writeText(text); setCopiedIndex(index); setTimeout(() => setCopiedIndex(null), 2000)
  }

  const copyAll = () => {
    navigator.clipboard.writeText(citations.map((c, i) => `${i + 1}. ${c.text}`).join('\n\n'))
    setCopiedAll(true); setTimeout(() => setCopiedAll(false), 2000)
  }

  const removeCitation = (i: number) => {
    const updated = citations.filter((_, idx) => idx !== i)
    setCitations(updated)
    if (projectId && updated.length === 0) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) supabase.from('project_sections').delete().eq('project_id', projectId).eq('user_id', session.user.id).eq('section', '__citations__')
      })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: inter }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#f0e8d0', letterSpacing: '-0.4px', margin: '0 0 4px', fontFamily: cinzel }}>References</h2>
          <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0 }}>
            Add references manually or import from Zotero · <strong style={{ color: 'rgba(201,148,58,0.6)' }}>AI-placed on export</strong>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saving && <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.25)' }}>Saving…</span>}
          {citations.length > 0 && !saving && <span style={{ fontSize: 10, color: 'rgba(52,211,153,0.5)' }}>✓ {citations.length} saved</span>}
        </div>
      </div>

      {/* Style selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginRight: 4 }}>Style</span>
        {STYLES.map(s => (
          <button key={s} onClick={() => setSelectedStyle(s)}
            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: selectedStyle === s ? 'rgba(201,148,58,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${selectedStyle === s ? 'rgba(201,148,58,0.4)' : 'rgba(255,255,255,0.07)'}`,
              color: selectedStyle === s ? '#c9943a' : 'rgba(240,232,208,0.4)', transition: 'all 0.15s' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        <button onClick={() => setTab('manual')}
          style={{ padding: '8px 18px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: inter,
            background: tab === 'manual' ? 'rgba(201,148,58,0.12)' : 'transparent',
            border: tab === 'manual' ? '1px solid rgba(201,148,58,0.3)' : '1px solid transparent',
            color: tab === 'manual' ? '#c9943a' : 'rgba(240,232,208,0.45)', transition: 'all 0.15s' }}>
          ✏️ Manual Input
        </button>
        <button onClick={() => setTab('zotero')}
          style={{ padding: '8px 18px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: inter,
            background: tab === 'zotero' ? 'rgba(201,148,58,0.12)' : 'transparent',
            border: tab === 'zotero' ? '1px solid rgba(201,148,58,0.3)' : '1px solid transparent',
            color: tab === 'zotero' ? '#c9943a' : 'rgba(240,232,208,0.45)', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 800 }}>Z</span> Zotero Library
          {zoteroUserId
            ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }}/>
            : <span style={{ fontSize: 10, opacity: 0.4 }}>🔒</span>}
        </button>
      </div>

      {/* ── MANUAL TAB ── */}
      {tab === 'manual' && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generateCitation() }}
            placeholder={`Paste anything — e.g.\n\n10.1056/NEJMoa2034577\n\nor: Smith J et al. Cardiac outcomes in diabetic patients. NEJM. 2021;384:1220.\n\nor: full paper title`}
            style={{ width: '100%', height: 130, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px', fontSize: 13, lineHeight: 1.7, color: '#f0e8d0', outline: 'none', resize: 'none', fontFamily: inter, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
            onFocus={e => (e.target.style.borderColor='rgba(201,148,58,0.35)')}
            onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.08)')}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 0 14px' }}>
            {!input.trim()
              ? <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.25)', fontStyle: 'italic' }}>Paste a DOI, title, or raw reference above to enable</span>
              : <span/>}
            <span style={{ fontSize: 10.5, color: 'rgba(240,232,208,0.2)' }}>⌘ + Enter to generate</span>
          </div>
          <button
            onClick={generateCitation}
            disabled={loading || !input.trim()}
            style={{ width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
              background: loading || !input.trim() ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#c9943a,#e8b84a)',
              color: loading || !input.trim() ? 'rgba(240,232,208,0.25)' : '#080c18',
              border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: inter }}>
            {loading
              ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(240,232,208,0.15)', borderTopColor: 'rgba(240,232,208,0.5)', animation: 'spin 0.8s linear infinite' }}/> Generating…</>
              : <>📎 Generate {selectedStyle} Citation</>}
          </button>
        </div>
      )}

      {/* ── ZOTERO TAB ── */}
      {tab === 'zotero' && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Not connected → show connect form */}
          {!zoteroUserId ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(201,148,58,0.04)', border: '1px solid rgba(201,148,58,0.12)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Connect your Zotero library</p>
                <ol style={{ fontSize: 12, color: 'rgba(240,232,208,0.45)', margin: 0, paddingLeft: 16, lineHeight: 2.2 }}>
                  <li>Go to <a href="https://www.zotero.org/settings/keys" target="_blank" rel="noreferrer" style={{ color: '#c9943a' }}>zotero.org/settings/keys</a></li>
                  <li>Create a new private key → enable <strong style={{ color: '#f0e8d0' }}>Library access (read only)</strong></li>
                  <li>Your <strong style={{ color: '#f0e8d0' }}>User ID</strong> is shown above the key list</li>
                </ol>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>User ID</label>
                  <input value={connectUserId} onChange={e => setConnectUserId(e.target.value)} placeholder="e.g. 1234567"
                    style={{ width: '100%', padding: '11px 13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#f0e8d0', outline: 'none', fontFamily: inter, boxSizing: 'border-box' }}
                    onFocus={e => (e.target.style.borderColor='rgba(201,148,58,0.4)')} onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.1)')}/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>API Key</label>
                  <input type="password" value={connectApiKey} onChange={e => setConnectApiKey(e.target.value)} placeholder="Your private API key"
                    style={{ width: '100%', padding: '11px 13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#f0e8d0', outline: 'none', fontFamily: inter, boxSizing: 'border-box' }}
                    onFocus={e => (e.target.style.borderColor='rgba(201,148,58,0.4)')} onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.1)')}/>
                </div>
              </div>
              {connectError && <p style={{ fontSize: 11, color: '#f87171', margin: 0, padding: '8px 12px', background: 'rgba(248,113,113,0.06)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)' }}>✕ {connectError}</p>}
              <button onClick={connectZotero} disabled={connecting || !connectUserId.trim() || !connectApiKey.trim()}
                style={{ padding: '13px', borderRadius: 11, fontSize: 13, fontWeight: 700, border: 'none', fontFamily: inter, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: connecting || !connectUserId.trim() || !connectApiKey.trim() ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#c9943a,#e8b84a)',
                  color: connecting || !connectUserId.trim() || !connectApiKey.trim() ? 'rgba(240,232,208,0.2)' : '#080c18',
                  cursor: connecting || !connectUserId.trim() || !connectApiKey.trim() ? 'not-allowed' : 'pointer' }}>
                {connecting
                  ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(8,12,24,0.3)', borderTopColor: '#080c18', animation: 'spin 0.8s linear infinite' }}/> Connecting…</>
                  : '✦ Connect Zotero Library'}
              </button>
            </div>

          ) : (
            /* Connected → show library */
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }}/>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399' }}>Zotero Connected</span>
                  </div>
                </div>
                <button onClick={disconnectZotero}
                  style={{ fontSize: 11, color: 'rgba(248,113,113,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                  onMouseEnter={e => (e.currentTarget.style.color='#f87171')}
                  onMouseLeave={e => (e.currentTarget.style.color='rgba(248,113,113,0.5)')}>
                  Disconnect
                </button>
              </div>

              {/* Search + collection filters */}
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="text" value={zQuery} onChange={e => setZQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { setSelectedCollection(''); fetchItems('', zQuery) } }}
                  placeholder="Search your library…"
                  style={{ flex: 1, padding: '10px 13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#f0e8d0', outline: 'none', fontFamily: inter }}
                  onFocus={e => (e.target.style.borderColor='rgba(201,148,58,0.4)')} onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.1)')}/>
                <button onClick={() => { setSelectedCollection(''); fetchItems('', zQuery) }}
                  style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(201,148,58,0.1)', border: '1px solid rgba(201,148,58,0.25)', color: '#c9943a', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: inter }}>
                  Search
                </button>
              </div>

              {collections.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => { setSelectedCollection(''); setZQuery(''); fetchItems('', '') }}
                    style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      background: !selectedCollection ? 'rgba(201,148,58,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${!selectedCollection ? 'rgba(201,148,58,0.4)' : 'rgba(255,255,255,0.07)'}`,
                      color: !selectedCollection ? '#c9943a' : 'rgba(240,232,208,0.4)', fontFamily: inter }}>All Items</button>
                  {collections.slice(0, 8).map(c => (
                    <button key={c.key} onClick={() => { setSelectedCollection(c.key); setZQuery(''); fetchItems(c.key, '') }}
                      style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        background: selectedCollection === c.key ? 'rgba(201,148,58,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${selectedCollection === c.key ? 'rgba(201,148,58,0.4)' : 'rgba(255,255,255,0.07)'}`,
                        color: selectedCollection === c.key ? '#c9943a' : 'rgba(240,232,208,0.4)', fontFamily: inter }}>{c.data.name}</button>
                  ))}
                </div>
              )}

              {zLoading ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(240,232,208,0.3)', fontSize: 13 }}>
                  <div style={{ width: 20, height: 20, border: '2px solid rgba(201,148,58,0.2)', borderTopColor: '#c9943a', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}/>
                  Loading library…
                </div>
              ) : zError ? (
                <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>✕ {zError}</p>
              ) : zItems.length === 0 ? (
                <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.3)', textAlign: 'center', padding: '20px 0', margin: 0 }}>No items found</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
                  {zItems.map(item => {
                    const selected = selectedKeys.has(item.key)
                    return (
                      <div key={item.key} onClick={() => toggleKey(item.key)}
                        style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                          background: selected ? 'rgba(201,148,58,0.08)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${selected ? 'rgba(201,148,58,0.35)' : 'rgba(255,255,255,0.06)'}`,
                          transition: 'all 0.15s', display: 'flex', alignItems: 'flex-start', gap: 12 }}
                        onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor='rgba(201,148,58,0.2)' }}
                        onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor='rgba(255,255,255,0.06)' }}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${selected ? '#c9943a' : 'rgba(255,255,255,0.15)'}`, background: selected ? 'rgba(201,148,58,0.2)' : 'transparent', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selected && <span style={{ fontSize: 10, color: '#c9943a', fontWeight: 700 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, color: '#f0e8d0', margin: '0 0 3px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.data.title || 'Untitled'}</p>
                          <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.35)', margin: 0 }}>
                            {item.data.creators?.slice(0, 2).map(c => c.lastName || c.name).filter(Boolean).join(', ')}
                            {item.data.date ? ` · ${item.data.date.slice(0,4)}` : ''}
                            {item.data.publicationTitle ? ` · ${item.data.publicationTitle}` : ''}
                          </p>
                        </div>
                        <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.25)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: 10, flexShrink: 0 }}>{item.data.itemType}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {selectedKeys.size > 0 && (
                <button onClick={importSelected} disabled={importing}
                  style={{ padding: '13px', borderRadius: 11, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#c9943a,#e8b84a)', color: '#080c18', border: 'none', cursor: 'pointer', fontFamily: inter, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {importing
                    ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(8,12,24,0.3)', borderTopColor: '#080c18', animation: 'spin 0.8s linear infinite' }}/> Importing…</>
                    : `✦ Import ${selectedKeys.size} reference${selectedKeys.size > 1 ? 's' : ''} as ${selectedStyle}`}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Citations list */}
      {citations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 2px' }}>Saved References ({citations.length})</p>
              <p style={{ fontSize: 10, color: 'rgba(240,232,208,0.2)', margin: 0 }}>These will be AI-placed into your manuscript on export</p>
            </div>
            <button onClick={copyAll}
              style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 8, background: 'rgba(201,148,58,0.08)', border: '1px solid rgba(201,148,58,0.2)', color: copiedAll ? '#34d399' : '#c9943a', cursor: 'pointer' }}>
              {copiedAll ? '✓ Copied all' : 'Copy all'}
            </button>
          </div>
          {citations.map((c, i) => (
            <div key={i} style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', transition: 'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(201,148,58,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor='rgba(255,255,255,0.07)')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(201,148,58,0.12)', border: '1px solid rgba(201,148,58,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#c9943a', flexShrink: 0 }}>{citations.length - i}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(201,148,58,0.5)', background: 'rgba(201,148,58,0.07)', border: '1px solid rgba(201,148,58,0.15)', padding: '2px 8px', borderRadius: 20 }}>{c.style}</span>
              </div>
              <p style={{ fontSize: 13, color: '#f0e8d0', lineHeight: 1.75, margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>{c.text}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => copy(c.text, i)}
                  style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: copiedIndex === i ? 'rgba(52,211,153,0.1)' : 'rgba(201,148,58,0.08)', border: `1px solid ${copiedIndex === i ? 'rgba(52,211,153,0.3)' : 'rgba(201,148,58,0.2)'}`, color: copiedIndex === i ? '#34d399' : '#c9943a' }}>
                  {copiedIndex === i ? '✓ Copied' : 'Copy'}
                </button>
                <button onClick={() => removeCitation(i)}
                  style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(240,232,208,0.3)' }}
                  onMouseEnter={e => { e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='rgba(248,113,113,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.color='rgba(240,232,208,0.3)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)' }}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {citations.length === 0 && tab === 'manual' && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.25 }}>📎</div>
          <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.2)', margin: 0 }}>Your saved references will appear here and be auto-placed on export</p>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
