'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'

interface DOIResult {
  doi: string
  title: string
  authors: { given: string; family: string; orcid: string }[]
  year: number | null
  journal: string
  journalAbbr: string
  volume: string
  issue: string
  pages: string
  abstract: string
  type: string
  publisher: string
  url: string
  vancouver: string
  citedBy: number
}

export default function DOIResolverPanel() {
  const [doi, setDoi] = useState('')
  const [result, setResult] = useState<DOIResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const inter = "var(--font-inter),'DM Sans',system-ui,sans-serif"
  const cinzel = "var(--font-cinzel),'Cormorant Garamond',Georgia,serif"

  const resolve = async (q = doi) => {
    const clean = q.trim()
    if (!clean) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await apiFetch(`/api/doi?doi=${encodeURIComponent(clean)}`)
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setResult(data)
    } catch { setError('Failed to resolve DOI') }
    setLoading(false)
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const exampleDois = [
    '10.1056/NEJMoa2001017',
    '10.1016/S0140-6736(20)30566-3',
    '10.1001/jama.2020.1585',
  ]

  return (
    <div style={{ padding: 'clamp(16px,3vw,28px)', fontFamily: inter }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px', fontWeight: 700 }}>✦ DOI Resolver</p>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f0e8d0', margin: '0 0 6px', fontFamily: cinzel }}>DOI Lookup</h2>
        <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.4)', margin: 0 }}>Paste any DOI to instantly fetch full citation details, abstract, and Vancouver-format reference.</p>
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          value={doi}
          onChange={e => setDoi(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && resolve()}
          placeholder="e.g. 10.1056/NEJMoa2001017 or https://doi.org/..."
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f0e8d0', fontSize: 13, fontFamily: inter, outline: 'none' }}
          onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button
          onClick={() => resolve()}
          disabled={loading || !doi.trim()}
          style={{ padding: '10px 18px', borderRadius: 10, background: loading ? 'rgba(201,148,58,0.08)' : 'linear-gradient(135deg,#c9943a,#e8b84a)', color: loading ? 'rgba(201,148,58,0.4)' : '#080c18', border: 'none', fontWeight: 700, fontSize: 13, cursor: loading || !doi.trim() ? 'not-allowed' : 'pointer', fontFamily: inter, whiteSpace: 'nowrap' }}
        >
          {loading ? '…' : 'Resolve'}
        </button>
      </div>

      {/* Example DOIs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.25)', alignSelf: 'center' }}>Try:</span>
        {exampleDois.map(d => (
          <button key={d} onClick={() => { setDoi(d); resolve(d) }} style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(240,232,208,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' }}>
            {d}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[80, 40, 120, 60].map((h, i) => (
            <div key={i} style={{ height: h, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Result */}
      {!loading && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Title card */}
          <div style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,148,58,0.15)' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#f0e8d0', margin: '0 0 10px', lineHeight: 1.45, fontFamily: cinzel }}>{result.title}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {result.year && <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: 'rgba(201,148,58,0.1)', border: '1px solid rgba(201,148,58,0.2)', color: '#c9943a', fontWeight: 700 }}>{result.year}</span>}
              {result.journalAbbr && <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.6)', fontStyle: 'italic' }}>{result.journalAbbr}</span>}
              {result.volume && <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.4)' }}>Vol.{result.volume}{result.issue ? `(${result.issue})` : ''}{result.pages ? `:${result.pages}` : ''}</span>}
              {result.citedBy > 0 && <span style={{ fontSize: 11, color: 'rgba(99,179,237,0.7)', marginLeft: 'auto' }}>Cited by {result.citedBy.toLocaleString()}</span>}
            </div>
          </div>

          {/* Authors */}
          {result.authors.length > 0 && (
            <div>
              <p style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px', fontWeight: 700 }}>Authors</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {result.authors.map((a, i) => (
                  <span key={i} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(240,232,208,0.65)' }}>
                    {a.family}{a.given ? ` ${a.given.split(' ').map(n => n[0]).join('')}` : ''}
                    {a.orcid && <a href={`https://orcid.org/${a.orcid}`} target="_blank" rel="noopener" style={{ marginLeft: 4, color: 'rgba(163,230,53,0.6)', fontSize: 10, textDecoration: 'none' }} title="ORCID">iD</a>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Abstract */}
          {result.abstract && (
            <div>
              <p style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px', fontWeight: 700 }}>Abstract</p>
              <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.55)', margin: 0, lineHeight: 1.7 }}>
                  {result.abstract.slice(0, 500)}{result.abstract.length > 500 ? '…' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Vancouver citation */}
          <div>
            <p style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px', fontWeight: 700 }}>Vancouver Citation</p>
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(201,148,58,0.04)', border: '1px solid rgba(201,148,58,0.12)' }}>
              <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.7)', margin: '0 0 10px', lineHeight: 1.6, fontFamily: 'Georgia, serif' }}>{result.vancouver}</p>
              <button
                onClick={() => copy(result.vancouver, 'vancouver')}
                style={{ padding: '6px 14px', borderRadius: 8, background: copied === 'vancouver' ? 'rgba(52,211,153,0.1)' : 'rgba(201,148,58,0.1)', border: `1px solid ${copied === 'vancouver' ? 'rgba(52,211,153,0.3)' : 'rgba(201,148,58,0.25)'}`, color: copied === 'vancouver' ? '#34d399' : '#c9943a', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: inter }}
              >
                {copied === 'vancouver' ? '✓ Copied' : '📎 Copy Citation'}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => copy(`https://doi.org/${result.doi}`, 'doilink')}
              style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: copied === 'doilink' ? '#34d399' : 'rgba(240,232,208,0.5)', fontSize: 12, cursor: 'pointer', fontFamily: inter }}
            >
              {copied === 'doilink' ? '✓ Copied' : '🔗 Copy DOI Link'}
            </button>
            <a
              href={result.url}
              target="_blank" rel="noopener"
              style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(240,232,208,0.5)', fontSize: 12, textDecoration: 'none', fontFamily: inter }}
            >
              View Article ↗
            </a>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }`}</style>
    </div>
  )
}
