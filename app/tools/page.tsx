'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api-fetch'
import FloatingIcons from '@/lib/components/FloatingIcons'

const cinzel = "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif"
const inter  = "var(--font-inter), 'DM Sans', system-ui, sans-serif"

const COMING_SOON = [
  { icon: '📚', name: 'Mendeley',      sub: 'Reference manager · mendeley.com',       desc: 'Sync your Mendeley library and access your saved papers, annotations, and collections inside ResearchDesk.', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.18)' },
  { icon: '🎓', name: 'Google Scholar', sub: 'Academic search · scholar.google.com',   desc: 'Pull citations, citation counts, and related articles from Google Scholar without leaving your workspace.',   color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.18)'  },
  { icon: '📖', name: 'EndNote',        sub: 'Reference manager · endnote.com',        desc: 'Import your EndNote library and sync references across projects. Supports X9 and EndNote 20+.',               color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.18)'  },
]

/* ── PubMed ── */
function PubMedTool() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState<string | null>(null)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true); setResults([])
    try {
      const res  = await apiFetch(`/api/pubmed/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.results || [])
    } finally { setLoading(false) }
  }

  const cite = (r: any) => {
    return `${r.authors}. ${r.title}. ${r.journal}. ${r.year}${r.doi ? `. doi:${r.doi}` : ''}`
  }

  const copy = (r: any) => {
    navigator.clipboard.writeText(cite(r))
    setCopied(r.pmid)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Search PubMed — e.g. splenic hydatid cyst treatment"
          style={{ flex: 1, padding: '11px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#f0e8d0', outline: 'none', fontFamily: inter }}
          onFocus={e => (e.target.style.borderColor = 'rgba(96,165,250,0.4)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button onClick={search} disabled={loading || !query.trim()}
          style={{ padding: '11px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa', fontFamily: inter, whiteSpace: 'nowrap' }}>
          {loading ? '…' : '🔬 Search'}
        </button>
      </div>
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map(r => (
            <div key={r.pmid} style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(96,165,250,0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: '#f0e8d0', textDecoration: 'none', lineHeight: 1.5, display: 'block', marginBottom: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#60a5fa')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#f0e8d0')}
                  >{r.title}</a>
                  <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.4)', margin: '0 0 2px' }}>{r.authors}</p>
                  <p style={{ fontSize: 11, color: 'rgba(96,165,250,0.6)', margin: 0 }}>{r.journal} · {r.year}{r.doi ? ` · doi:${r.doi}` : ''}</p>
                </div>
                <button onClick={() => copy(r)}
                  style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: copied === r.pmid ? 'rgba(52,211,153,0.12)' : 'rgba(96,165,250,0.08)', border: `1px solid ${copied === r.pmid ? 'rgba(52,211,153,0.3)' : 'rgba(96,165,250,0.2)'}`, color: copied === r.pmid ? '#34d399' : '#60a5fa', fontFamily: inter, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {copied === r.pmid ? '✓ Copied' : 'Copy cite'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && results.length === 0 && query && (
        <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.25)', margin: 0, textAlign: 'center', padding: '12px 0' }}>No results found. Try different keywords.</p>
      )}
    </div>
  )
}

/* ── ClinicalTrials ── */
function ClinicalTrialsTool() {
  const [query, setQuery]   = useState('')
  const [result, setResult] = useState<any>(null)
  const [list, setList]     = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [copied, setCopied] = useState(false)

  const isNct = (s: string) => /^NCT\d+$/i.test(s.trim())

  const search = async () => {
    if (!query.trim()) return
    setLoading(true); setResult(null); setList([]); setError('')
    try {
      const param = isNct(query) ? `nct=${encodeURIComponent(query.trim().toUpperCase())}` : `q=${encodeURIComponent(query.trim())}`
      const res  = await apiFetch(`/api/clinical-trials?${param}`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      if (data.nctId) setResult(data)
      else setList(data.studies || [])
    } catch { setError('Failed to fetch') }
    finally { setLoading(false) }
  }

  const methodsText = result ? `This study was registered on ClinicalTrials.gov (${result.nctId}). Title: "${result.title}". Phase: ${result.phase}. Condition: ${result.condition}. Intervention: ${result.intervention}. Enrollment: ${result.enrollment} participants. Sponsor: ${result.sponsor}.` : ''

  const copy = () => {
    navigator.clipboard.writeText(methodsText)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Enter NCT number (e.g. NCT01234567) or condition name"
          style={{ flex: 1, padding: '11px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#f0e8d0', outline: 'none', fontFamily: inter }}
          onFocus={e => (e.target.style.borderColor = 'rgba(232,121,249,0.4)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button onClick={search} disabled={loading || !query.trim()}
          style={{ padding: '11px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(232,121,249,0.12)', border: '1px solid rgba(232,121,249,0.3)', color: '#e879f9', fontFamily: inter, whiteSpace: 'nowrap' }}>
          {loading ? '…' : '🏥 Fetch'}
        </button>
      </div>

      {error && <p style={{ fontSize: 12, color: '#f87171', margin: 0, padding: '10px 14px', background: 'rgba(248,113,113,0.06)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)' }}>✕ {error}</p>}

      {result && (
        <div style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(232,121,249,0.05)', border: '1px solid rgba(232,121,249,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(232,121,249,0.12)', border: '1px solid rgba(232,121,249,0.25)', color: '#e879f9' }}>{result.nctId}</span>
              <span style={{ fontSize: 11, color: result.status === 'COMPLETED' ? '#34d399' : 'rgba(240,232,208,0.4)', fontWeight: 600 }}>{result.status}</span>
            </div>
            <a href={result.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'rgba(232,121,249,0.6)', textDecoration: 'none' }}>View on ClinicalTrials.gov →</a>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f0e8d0', margin: '0 0 10px', lineHeight: 1.5 }}>{result.title}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
            {[
              ['Phase', result.phase],
              ['Condition', result.condition],
              ['Enrollment', result.enrollment ? `${result.enrollment} participants` : 'N/A'],
              ['Sponsor', result.sponsor],
            ].map(([label, val]) => val ? (
              <div key={label as string} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: 10, color: 'rgba(232,121,249,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px', fontWeight: 700 }}>{label}</p>
                <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.7)', margin: 0 }}>{val}</p>
              </div>
            ) : null)}
          </div>
          <button onClick={copy}
            style={{ padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: copied ? 'rgba(52,211,153,0.12)' : 'rgba(232,121,249,0.08)', border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'rgba(232,121,249,0.2)'}`, color: copied ? '#34d399' : '#e879f9', fontFamily: inter }}>
            {copied ? '✓ Copied to clipboard' : 'Copy Methods text'}
          </button>
        </div>
      )}

      {list.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((s: any) => (
            <a key={s.nctId} href={s.url} target="_blank" rel="noreferrer" style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(232,121,249,0.1)', textDecoration: 'none', display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#e879f9' }}>{s.nctId}</span>
                <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)' }}>{s.status}</span>
                {s.phase && <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.25)' }}>{s.phase}</span>}
              </div>
              <p style={{ fontSize: 13, color: '#f0e8d0', margin: 0, lineHeight: 1.4 }}>{s.title}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── ORCID ── */
function OrcidTool() {
  const [orcid, setOrcid]   = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [copied, setCopied] = useState(false)

  const fetch_ = async () => {
    if (!orcid.trim()) return
    setLoading(true); setProfile(null); setError('')
    try {
      const res  = await apiFetch(`/api/orcid?id=${encodeURIComponent(orcid.trim())}`)
      const data = await res.json()
      if (data.error) setError(data.error)
      else setProfile(data)
    } catch { setError('Failed to fetch') }
    finally { setLoading(false) }
  }

  const copy = () => {
    if (!profile) return
    const text = `${profile.name}${profile.affiliation ? `, ${profile.affiliation}` : ''}${profile.country ? `, ${profile.country}` : ''}. ORCID: ${profile.orcid}`
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          value={orcid} onChange={e => setOrcid(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetch_()}
          placeholder="Enter ORCID iD — e.g. 0000-0002-1825-0097"
          style={{ flex: 1, padding: '11px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#f0e8d0', outline: 'none', fontFamily: inter, letterSpacing: '0.05em' }}
          onFocus={e => (e.target.style.borderColor = 'rgba(249,115,22,0.4)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button onClick={fetch_} disabled={loading || !orcid.trim()}
          style={{ padding: '11px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', fontFamily: inter, whiteSpace: 'nowrap' }}>
          {loading ? '…' : '🧬 Lookup'}
        </button>
      </div>

      {error && <p style={{ fontSize: 12, color: '#f87171', margin: 0, padding: '10px 14px', background: 'rgba(248,113,113,0.06)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)' }}>✕ {error}</p>}

      {profile && (
        <div style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🧬</div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#f0e8d0', margin: '0 0 3px', fontFamily: cinzel }}>{profile.name}</p>
                {profile.affiliation && <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.45)', margin: 0 }}>{profile.affiliation}{profile.country ? ` · ${profile.country}` : ''}</p>}
              </div>
            </div>
            <a href={profile.profileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'rgba(249,115,22,0.6)', textDecoration: 'none' }}>View ORCID →</a>
          </div>

          {profile.bio && <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.4)', lineHeight: 1.65, margin: '0 0 14px', borderLeft: '2px solid rgba(249,115,22,0.2)', paddingLeft: 12 }}>{profile.bio.slice(0, 200)}{profile.bio.length > 200 ? '…' : ''}</p>}

          {profile.recentWorks?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 10, color: 'rgba(249,115,22,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, margin: '0 0 8px' }}>Recent works</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {profile.recentWorks.map((w: any, i: number) => (
                  <div key={i} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.7)', margin: '0 0 2px', lineHeight: 1.4 }}>{w.title}</p>
                    <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: 0 }}>{w.journal}{w.year ? ` · ${w.year}` : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={copy}
            style={{ padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: copied ? 'rgba(52,211,153,0.12)' : 'rgba(249,115,22,0.08)', border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'rgba(249,115,22,0.2)'}`, color: copied ? '#34d399' : '#f97316', fontFamily: inter }}>
            {copied ? '✓ Copied' : 'Copy author info'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Active integration card wrapper ── */
function ActiveCard({ icon, name, sub, color, bg, border, children }: any) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${open ? border : 'rgba(255,255,255,0.08)'}`, borderRadius: 20, overflow: 'hidden', marginBottom: 16, transition: 'border-color 0.3s' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${color}66, transparent)` }}/>
      <div style={{ padding: '22px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#f0e8d0', margin: '0 0 2px', fontFamily: cinzel }}>{name}</p>
              <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.35)', margin: 0 }}>{sub}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: `${bg}`, border: `1px solid ${border}` }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }}/>
              <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.06em' }}>LIVE</span>
            </div>
            <span style={{ fontSize: 16, color: 'rgba(240,232,208,0.3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>⌄</span>
          </div>
        </div>
        {open && <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid rgba(255,255,255,0.06)` }}>{children}</div>}
      </div>
    </div>
  )
}

export default function ToolsPage() {
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) router.push('/login')
    }
    load()
  }, [])

  return (
    <div style={{ position: 'relative', background: '#080c18', minHeight: '100vh', color: '#f0e8d0', fontFamily: inter }}>
      <FloatingIcons />
      <nav style={{ borderBottom: '1px solid rgba(201,148,58,0.15)', padding: '18px 56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,8,15,0.8)', backdropFilter: 'blur(20px)', borderTop: '2px solid rgba(201,148,58,0.5)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.webp" alt="R" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}/>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: cinzel, letterSpacing: '0.03em' }}>
            <span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span>
          </span>
        </Link>
        <Link href="/dashboard" style={{ fontSize: 12, color: 'rgba(201,148,58,0.6)', textDecoration: 'none', letterSpacing: '0.06em' }}>← Back to Dashboard</Link>
      </nav>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 860, margin: '0 auto', padding: 'clamp(24px, 5vw, 64px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12, fontFamily: cinzel }}>✦ &nbsp; Integrations</p>
          <h1 style={{ fontSize: 38, fontWeight: 600, color: '#f0e8d0', margin: '0 0 10px', fontFamily: cinzel, lineHeight: 1.1 }}>Tools & Integrations</h1>
          <p style={{ fontSize: 14, color: 'rgba(240,232,208,0.4)', margin: 0, lineHeight: 1.7 }}>Connect your research tools. Import references, fetch trial data, and look up researchers without leaving ResearchDesk.</p>
          <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(201,148,58,0.35), transparent)', marginTop: 24 }}/>
        </div>

        <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 16 }}>Active</p>

        {/* PubMed */}
        <ActiveCard icon="🔬" name="PubMed" sub="Literature database · pubmed.ncbi.nlm.nih.gov" color="#60a5fa" bg="rgba(96,165,250,0.08)" border="rgba(96,165,250,0.2)">
          <PubMedTool />
        </ActiveCard>

        {/* ClinicalTrials */}
        <ActiveCard icon="🏥" name="ClinicalTrials.gov" sub="Trial registry · clinicaltrials.gov" color="#e879f9" bg="rgba(232,121,249,0.08)" border="rgba(232,121,249,0.2)">
          <ClinicalTrialsTool />
        </ActiveCard>

        {/* ORCID */}
        <ActiveCard icon="🧬" name="ORCID" sub="Researcher identity · orcid.org" color="#f97316" bg="rgba(249,115,22,0.08)" border="rgba(249,115,22,0.2)">
          <OrcidTool />
        </ActiveCard>

        {/* Coming soon */}
        <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.25)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 16, marginTop: 16 }}>Coming Soon</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {COMING_SOON.map(t => (
            <div key={t.name} style={{ background: 'rgba(255,255,255,0.018)', border: `1px solid ${t.border}`, borderRadius: 18, overflow: 'hidden', opacity: 0.72, transition: 'opacity 0.2s' }}
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
