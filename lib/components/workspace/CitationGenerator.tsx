'use client'
import { apiFetch } from '@/lib/api-fetch'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const inter = "var(--font-inter), 'DM Sans', system-ui, sans-serif"

const STYLES = ['Vancouver', 'APA', 'AMA', 'Harvard', 'MLA']

interface ZoteroItem {
  key: string
  data: {
    title: string
    itemType: string
    creators?: { firstName?: string; lastName?: string; name?: string }[]
    date?: string
    publicationTitle?: string
    journalAbbreviation?: string
    volume?: string
    issue?: string
    pages?: string
    DOI?: string
    url?: string
    publisher?: string
    place?: string
  }
}

interface ZoteroCollection {
  key: string
  data: { name: string; parentCollection?: string }
}

function zoteroItemLabel(item: ZoteroItem) {
  const d = item.data
  const authors = d.creators?.slice(0, 2).map(c => c.lastName || c.name || '').filter(Boolean).join(', ')
  const year = d.date ? d.date.slice(0, 4) : ''
  return `${d.title || 'Untitled'}${authors ? ` · ${authors}` : ''}${year ? ` (${year})` : ''}`
}

function zoteroToRefString(item: ZoteroItem): string {
  const d = item.data
  const authors = (d.creators || [])
    .map(c => c.lastName ? `${c.lastName} ${(c.firstName || '').charAt(0)}` : c.name || '')
    .filter(Boolean)
    .join(', ')
  const year = d.date ? d.date.slice(0, 4) : ''
  const parts = [authors, d.title, d.publicationTitle || d.publisher, year, d.volume, d.pages, d.DOI ? `DOI:${d.DOI}` : '']
  return parts.filter(Boolean).join('. ')
}

export default function CitationGenerator() {
  const [tab, setTab]               = useState<'manual' | 'zotero'>('manual')
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [citations, setCitations]   = useState<{ text: string; style: string; input: string }[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copiedAll, setCopiedAll]   = useState(false)
  const [selectedStyle, setSelectedStyle] = useState('Vancouver')

  // Zotero state
  const [zoteroUserId, setZoteroUserId]   = useState<string | null>(null)
  const [zoteroApiKey, setZoteroApiKey]   = useState<string | null>(null)
  const [collections, setCollections]     = useState<ZoteroCollection[]>([])
  const [zItems, setZItems]               = useState<ZoteroItem[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>('')
  const [zQuery, setZQuery]               = useState('')
  const [zLoading, setZLoading]           = useState(false)
  const [zError, setZError]               = useState('')
  const [selectedKeys, setSelectedKeys]   = useState<Set<string>>(new Set())
  const [importing, setImporting]         = useState(false)

  useEffect(() => {
    const loadCreds = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('zotero_user_id, zotero_api_key')
        .eq('id', user.id)
        .single()
      if (profile?.zotero_user_id && profile?.zotero_api_key) {
        setZoteroUserId(profile.zotero_user_id)
        setZoteroApiKey(profile.zotero_api_key)
      }
    }
    loadCreds()
  }, [])

  useEffect(() => {
    if (tab === 'zotero' && zoteroUserId && zoteroApiKey && collections.length === 0) {
      fetchCollections()
    }
  }, [tab, zoteroUserId, zoteroApiKey])

  const fetchCollections = async () => {
    if (!zoteroUserId || !zoteroApiKey) return
    setZLoading(true)
    setZError('')
    try {
      const res = await fetch('/api/zotero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'collections', userId: zoteroUserId, apiKey: zoteroApiKey }),
      })
      const data = await res.json()
      if (data.collections) setCollections(data.collections)
      else setZError('Could not load collections')
      // Also load recent items
      await fetchItems('', '')
    } catch {
      setZError('Network error loading Zotero library')
    } finally {
      setZLoading(false)
    }
  }

  const fetchItems = async (collectionKey: string, query: string) => {
    if (!zoteroUserId || !zoteroApiKey) return
    setZLoading(true)
    setZError('')
    try {
      const res = await fetch('/api/zotero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'items', userId: zoteroUserId, apiKey: zoteroApiKey, collectionKey, query }),
      })
      const data = await res.json()
      if (data.items) setZItems(data.items)
      else setZError('Could not load items')
    } catch {
      setZError('Network error loading items')
    } finally {
      setZLoading(false)
    }
  }

  const toggleKey = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const importSelected = async () => {
    const toImport = zItems.filter(i => selectedKeys.has(i.key))
    if (!toImport.length) return
    setImporting(true)
    for (const item of toImport) {
      const refString = zoteroToRefString(item)
      try {
        const res = await apiFetch('/api/citation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: refString, style: selectedStyle }),
        })
        const data = await res.json()
        if (data.citation) {
          setCitations(prev => [{ text: data.citation, style: selectedStyle, input: item.data.title || refString }, ...prev])
        }
      } catch { /* skip failed */ }
    }
    setSelectedKeys(new Set())
    setImporting(false)
    setTab('manual') // switch to results view
  }

  const generateCitation = async () => {
    if (!input.trim()) return
    setLoading(true)
    try {
      const res = await apiFetch('/api/citation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, style: selectedStyle }),
      })
      const data = await res.json()
      if (data.citation) {
        setCitations(prev => [{ text: data.citation, style: selectedStyle, input: input.trim() }, ...prev])
        setInput('')
      } else { console.error('Citation generation failed:', data.error) }
    } catch (e) { console.error('CitationGenerator error:', e) }
    finally { setLoading(false) }
  }

  const copy = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const copyAll = () => {
    navigator.clipboard.writeText(citations.map((c, i) => `${i + 1}. ${c.text}`).join('\n\n'))
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: inter }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#f0e8d0', letterSpacing: '-0.4px', margin: '0 0 4px' }}>Citation Generator</h2>
          <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0 }}>Paste a DOI or reference, or import directly from your Zotero library</p>
        </div>
        {!zoteroUserId && (
          <a href="/settings" style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', textDecoration: 'none', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(201,148,58,0.2)', background: 'rgba(201,148,58,0.05)', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#c9943a'; e.currentTarget.style.borderColor = 'rgba(201,148,58,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(201,148,58,0.6)'; e.currentTarget.style.borderColor = 'rgba(201,148,58,0.2)' }}>
            ⚙ Connect Zotero
          </a>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {[
          { id: 'manual', label: '✏️  Manual Input' },
          { id: 'zotero', label: 'Z  Zotero Library', disabled: !zoteroUserId },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => !t.disabled && setTab(t.id as any)}
            title={t.disabled ? 'Connect Zotero in Settings first' : ''}
            style={{
              padding: '8px 18px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: t.disabled ? 'not-allowed' : 'pointer',
              background: tab === t.id ? 'rgba(201,148,58,0.12)' : 'transparent',
              border: tab === t.id ? '1px solid rgba(201,148,58,0.3)' : '1px solid transparent',
              color: t.disabled ? 'rgba(240,232,208,0.2)' : tab === t.id ? '#c9943a' : 'rgba(240,232,208,0.45)',
              transition: 'all 0.15s', fontFamily: inter,
            }}
          >{t.label}{t.disabled ? ' 🔒' : ''}</button>
        ))}
      </div>

      {/* Style selector — shared */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginRight: 4 }}>Style</span>
        {STYLES.map(s => (
          <button key={s} onClick={() => setSelectedStyle(s)}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: selectedStyle === s ? 'rgba(201,148,58,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${selectedStyle === s ? 'rgba(201,148,58,0.4)' : 'rgba(255,255,255,0.07)'}`,
              color: selectedStyle === s ? '#c9943a' : 'rgba(240,232,208,0.4)', transition: 'all 0.15s',
            }}
          >{s}</button>
        ))}
      </div>

      {/* ── MANUAL TAB ── */}
      {tab === 'manual' && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generateCitation() }}
            placeholder={`Paste anything — e.g.\n\n10.1056/NEJMoa2034577\n\nor: Smith J et al. Cardiac outcomes in diabetic patients. NEJM. 2021;384:1220.\n\nor: full paper title`}
            style={{
              width: '100%', height: 130, background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
              padding: '14px 16px', fontSize: 13, lineHeight: 1.7,
              color: '#f0e8d0', outline: 'none', resize: 'none',
              fontFamily: inter, boxSizing: 'border-box', transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.35)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
          <p style={{ fontSize: 10.5, color: 'rgba(240,232,208,0.2)', margin: '6px 0 14px', textAlign: 'right' }}>⌘ + Enter to generate</p>
          <button
            onClick={generateCitation}
            disabled={loading || !input.trim()}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
              background: loading || !input.trim() ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #c9943a, #e8b84a)',
              color: loading || !input.trim() ? 'rgba(240,232,208,0.25)' : '#080c18',
              border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: inter,
            }}
          >
            {loading ? (
              <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(240,232,208,0.15)', borderTopColor: 'rgba(240,232,208,0.5)', animation: 'spin 0.8s linear infinite' }}/> Generating {selectedStyle} citation…</>
            ) : <>📎 Generate {selectedStyle} Citation</>}
          </button>
        </div>
      )}

      {/* ── ZOTERO TAB ── */}
      {tab === 'zotero' && zoteroUserId && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Search + Collection filter */}
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              value={zQuery}
              onChange={e => setZQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setSelectedCollection(''); fetchItems('', zQuery) } }}
              placeholder="Search your library…"
              style={{ flex: 1, padding: '10px 13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#f0e8d0', outline: 'none', fontFamily: inter, transition: 'border-color 0.2s' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <button
              onClick={() => { setSelectedCollection(''); fetchItems('', zQuery) }}
              style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(201,148,58,0.1)', border: '1px solid rgba(201,148,58,0.25)', color: '#c9943a', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: inter, whiteSpace: 'nowrap' }}>
              Search
            </button>
          </div>

          {/* Collections pills */}
          {collections.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => { setSelectedCollection(''); setZQuery(''); fetchItems('', '') }}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: !selectedCollection ? 'rgba(201,148,58,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${!selectedCollection ? 'rgba(201,148,58,0.4)' : 'rgba(255,255,255,0.07)'}`,
                  color: !selectedCollection ? '#c9943a' : 'rgba(240,232,208,0.4)', transition: 'all 0.15s', fontFamily: inter,
                }}>All Items</button>
              {collections.slice(0, 8).map(c => (
                <button key={c.key}
                  onClick={() => { setSelectedCollection(c.key); setZQuery(''); fetchItems(c.key, '') }}
                  style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: selectedCollection === c.key ? 'rgba(201,148,58,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${selectedCollection === c.key ? 'rgba(201,148,58,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    color: selectedCollection === c.key ? '#c9943a' : 'rgba(240,232,208,0.4)', transition: 'all 0.15s', fontFamily: inter,
                  }}>{c.data.name}</button>
              ))}
            </div>
          )}

          {/* Item list */}
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
                  <div
                    key={item.key}
                    onClick={() => toggleKey(item.key)}
                    style={{
                      padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                      background: selected ? 'rgba(201,148,58,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${selected ? 'rgba(201,148,58,0.35)' : 'rgba(255,255,255,0.06)'}`,
                      transition: 'all 0.15s', display: 'flex', alignItems: 'flex-start', gap: 12,
                    }}
                    onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(201,148,58,0.2)' }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${selected ? '#c9943a' : 'rgba(255,255,255,0.15)'}`, background: selected ? 'rgba(201,148,58,0.2)' : 'transparent', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                      {selected && <span style={{ fontSize: 10, color: '#c9943a', fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: '#f0e8d0', margin: '0 0 3px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.data.title || 'Untitled'}</p>
                      <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.35)', margin: 0 }}>
                        {item.data.creators?.slice(0, 2).map(c => c.lastName || c.name).filter(Boolean).join(', ')}{item.data.date ? ` · ${item.data.date.slice(0, 4)}` : ''}{item.data.publicationTitle ? ` · ${item.data.publicationTitle}` : ''}
                      </p>
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.25)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: 10, flexShrink: 0, marginTop: 1 }}>{item.data.itemType}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Import button */}
          {selectedKeys.size > 0 && (
            <button
              onClick={importSelected}
              disabled={importing}
              style={{
                padding: '13px', borderRadius: 11, fontSize: 13, fontWeight: 700,
                background: 'linear-gradient(135deg, #c9943a, #e8b84a)',
                color: '#080c18', border: 'none', cursor: 'pointer',
                transition: 'all 0.2s', fontFamily: inter,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(201,148,58,0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
            >
              {importing ? (
                <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(8,12,24,0.3)', borderTopColor: '#080c18', animation: 'spin 0.8s linear infinite' }}/> Importing…</>
              ) : `✦ Import ${selectedKeys.size} reference${selectedKeys.size > 1 ? 's' : ''} as ${selectedStyle}`}
            </button>
          )}
        </div>
      )}

      {/* ── RESULTS ── */}
      {citations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
              Generated Citations ({citations.length})
            </p>
            <button onClick={copyAll}
              style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 8, background: 'rgba(201,148,58,0.08)', border: '1px solid rgba(201,148,58,0.2)', color: copiedAll ? '#34d399' : '#c9943a', cursor: 'pointer', transition: 'all 0.2s' }}>
              {copiedAll ? '✓ Copied all' : 'Copy all'}
            </button>
          </div>

          {citations.map((c, i) => (
            <div key={i}
              style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', transition: 'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,148,58,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(201,148,58,0.12)', border: '1px solid rgba(201,148,58,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#c9943a', flexShrink: 0 }}>{citations.length - i}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(201,148,58,0.5)', background: 'rgba(201,148,58,0.07)', border: '1px solid rgba(201,148,58,0.15)', padding: '2px 8px', borderRadius: 20 }}>{c.style}</span>
              </div>
              <p style={{ fontSize: 13, color: '#f0e8d0', lineHeight: 1.75, margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>{c.text}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => copy(c.text, i)}
                  style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: copiedIndex === i ? 'rgba(52,211,153,0.1)' : 'rgba(201,148,58,0.08)', border: `1px solid ${copiedIndex === i ? 'rgba(52,211,153,0.3)' : 'rgba(201,148,58,0.2)'}`, color: copiedIndex === i ? '#34d399' : '#c9943a', transition: 'all 0.2s' }}>
                  {copiedIndex === i ? '✓ Copied' : 'Copy'}
                </button>
                <button onClick={() => setCitations(prev => prev.filter((_, idx) => idx !== i))}
                  style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(240,232,208,0.3)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(240,232,208,0.3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
                >Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {citations.length === 0 && tab === 'manual' && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.25 }}>📎</div>
          <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.2)', margin: 0 }}>Your generated citations will appear here</p>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
