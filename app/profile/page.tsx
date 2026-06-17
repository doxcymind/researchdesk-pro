'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useSessionGuard } from '@/lib/hooks/useSessionGuard'
import FloatingIcons from '@/lib/components/FloatingIcons'

// Editorial Luxe type set for the profile page:
//   inter    = body / UI sans   → Hanken Grotesk
//   cinzel   = display headings → Fraunces
//   playfair = numerals         → Bodoni Moda
const inter    = "var(--font-hanken), 'Hanken Grotesk', system-ui, sans-serif"
const cinzel   = "var(--font-fraunces), 'Fraunces', Georgia, serif"
const playfair = "var(--font-bodoni), 'Bodoni Moda', Georgia, serif"

const NAV = [
  { label: 'Dashboard',    icon: '◈', href: '/dashboard' },
  { label: 'All Projects', icon: '⬡', href: '/projects' },
  { label: 'New Project',  icon: '+', href: '/new-project' },
  { label: 'Tools',        icon: '🔧', href: '/tools' },
  { label: 'Profile',      icon: '✦', href: '/profile' },
  { label: 'Settings',     icon: '⚙', href: '/settings' },
]

interface Affil { organization: string; role: string; department: string; startYear: string; endYear: string }
interface Funding { title: string; organization: string; type: string; startYear: string; endYear: string }
interface ExtId { type: string; value: string; url: string }
interface OrcidData {
  name: string; role: string; otherNames: string[]; affiliation: string; country: string; bio: string
  keywords: string[]; links: { name: string; url: string }[]; externalIds: ExtId[]
  employments: Affil[]; educations: Affil[]; qualifications: Affil[]
  distinctions: Affil[]; memberships: Affil[]; services: Affil[]; invitedPositions: Affil[]
  fundings: Funding[]; peerReviewCount: number
  works: { title: string; year: string; journal: string; type: string; doi: string }[]
  profileUrl: string
}

interface ByYear { year: number; works: number; citations: number }
interface Pub { title: string; year: number; citations: number; type: string; venue: string; doi: string; authors: string[] }
interface OAData {
  metrics: { worksCount: number; citations: number; hIndex: number; i10Index: number }
  byYear: ByYear[]; fields: string[]
  coauthors: { name: string; count: number }[]
  venues: { name: string; count: number }[]
  workTypes: { name: string; count: number }[]
  pubs: Pub[]; authorUrl: string; displayName: string
}

const WORKS_PREVIEW = 10

/* ── count-up ── */
function useCounter(target: number, trigger: boolean, duration = 1100) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!trigger) { setV(0); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      setV(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, trigger, duration])
  return v
}

function StatCard({ value, label, accent, delay, animate }: { value: number | string; label: string; accent: string; delay: number; animate: boolean }) {
  const isNum = typeof value === 'number'
  const n = useCounter(isNum ? (value as number) : 0, animate && isNum)
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        flex: '1 1 110px', minWidth: 100, padding: '18px 18px', borderRadius: 14,
        background: hover ? 'rgba(201,148,58,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hover ? 'rgba(201,148,58,0.28)' : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 0.22s cubic-bezier(.2,.8,.2,1)', transform: hover ? 'translateY(-4px)' : 'none',
        animation: `pfFadeUp 0.55s ${delay}s both`, position: 'relative', overflow: 'hidden',
      }}>
      <div style={{ fontSize: 38, fontWeight: 700, color: accent, fontFamily: playfair, fontVariantNumeric: 'lining-nums', lineHeight: 1, letterSpacing: '0.01em' }}>
        {isNum ? n.toLocaleString() : value}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(240,232,208,0.42)', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700, marginTop: 8 }}>{label}</div>
      <div style={{ position: 'absolute', bottom: -22, right: -22, width: 66, height: 66, borderRadius: '50%', background: accent, opacity: hover ? 0.16 : 0.08, filter: 'blur(14px)', transition: 'opacity 0.22s' }} />
    </div>
  )
}

/* Section wrapper */
function Section({ title, aside, children, delay = 0 }: { title: string; aside?: React.ReactNode; children: React.ReactNode; delay?: number }) {
  return (
    <div style={{ marginBottom: 22, animation: `pfFadeUp 0.55s ${delay}s both` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, margin: 0 }}>{title}</p>
        {aside}
      </div>
      {children}
    </div>
  )
}

const cardStyle: React.CSSProperties = { padding: '22px 24px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }

/* Timeline list (education/employment/funding etc.) */
function TimelineList({ items, accent }: { items: { primary: string; secondary: string; meta?: string }[]; accent: string }) {
  return (
    <div style={cardStyle}>
      {items.map((it, i) => (
        <div key={i} style={{ marginBottom: i < items.length - 1 ? 16 : 0, paddingLeft: 14, borderLeft: `2px solid ${accent}` }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f0e8d0', margin: '0 0 2px' }}>{it.primary}</p>
          <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.5)', margin: 0 }}>{it.secondary}</p>
          {it.meta && <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: '3px 0 0', fontFamily: playfair, fontVariantNumeric: 'lining-nums' }}>{it.meta}</p>}
        </div>
      ))}
    </div>
  )
}

/* Research Output — elegant node timeline (works/yr) + citations sparkline */
function OutputChart({ byYear }: { byYear: ByYear[] }) {
  if (!byYear.length) return null
  const data = [...byYear].sort((a, b) => a.year - b.year)
  const maxW = Math.max(1, ...data.map(d => d.works))
  const maxC = Math.max(1, ...data.map(d => d.citations))
  const totalC = data.reduce((s, d) => s + d.citations, 0)

  // sparkline geometry
  const W = 100, H = 30
  const pts = data.map((d, i) => {
    const x = data.length === 1 ? W / 2 : (i / (data.length - 1)) * W
    const y = H - (d.citations / maxC) * H
    return [x, y]
  })
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`

  return (
    <div style={{ position: 'relative', overflow: 'hidden', padding: '24px 28px 20px', borderRadius: 16, background: 'linear-gradient(160deg, rgba(201,148,58,0.05), rgba(255,255,255,0.015))', border: '1px solid rgba(201,148,58,0.14)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, margin: 0 }}>Research Output &amp; Impact</p>
        <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.35)', margin: 0 }}>
          <span style={{ fontFamily: playfair, fontVariantNumeric: 'lining-nums', color: 'rgba(201,148,58,0.8)', fontWeight: 600 }}>{totalC}</span> citations
        </p>
      </div>

      {/* works-per-year nodes */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: data.length > 16 ? 2 : 8, marginBottom: 18 }}>
        <div style={{ position: 'absolute', left: 8, right: 8, top: '50%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,148,58,0.35) 12%, rgba(201,148,58,0.35) 88%, transparent)', transform: 'translateY(-0.5px)' }} />
        {data.map((d, i) => {
          const size = d.works ? 9 + (d.works / maxW) * 19 : 5
          return (
            <div key={d.year} title={`${d.year}: ${d.works} work${d.works === 1 ? '' : 's'}, ${d.citations} citation${d.citations === 1 ? '' : 's'}`}
              style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 64 }}>
              <span style={{ position: 'absolute', top: 0, fontSize: 13, fontWeight: 700, fontFamily: playfair, fontVariantNumeric: 'lining-nums', color: d.works ? 'rgba(232,184,74,0.95)' : 'transparent' }}>{d.works || ''}</span>
              <div style={{
                width: size, height: size, borderRadius: '50%',
                background: d.works ? 'radial-gradient(circle at 35% 30%, #f3d68f, #c9943a)' : 'rgba(240,232,208,0.18)',
                border: d.works ? '1px solid rgba(255,228,150,0.6)' : '1px solid rgba(255,255,255,0.12)',
                boxShadow: d.works ? `0 0 ${6 + d.works * 3}px rgba(201,148,58,0.5)` : 'none',
                zIndex: 1, animation: `pfNode 0.5s ${0.2 + i * 0.05}s both`,
              }} />
              <span style={{ position: 'absolute', bottom: 0, fontSize: 10.5, fontFamily: playfair, fontVariantNumeric: 'lining-nums', color: d.works ? 'rgba(240,232,208,0.55)' : 'rgba(240,232,208,0.25)', whiteSpace: 'nowrap' }}>
                {data.length > 14 ? `’${String(d.year).slice(2)}` : d.year}
              </span>
            </div>
          )
        })}
      </div>

      {/* citations sparkline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 9, color: 'rgba(240,232,208,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, whiteSpace: 'nowrap' }}>Citations</span>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 30, overflow: 'visible' }}>
          <defs>
            <linearGradient id="pfSpark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(52,211,153,0.35)" />
              <stop offset="100%" stopColor="rgba(52,211,153,0)" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#pfSpark)" />
          <path d={line} fill="none" stroke="#34d399" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  )
}

const TYPE_COLOR: Record<string, string> = {
  review: '#a78bfa', article: '#60a5fa', 'book-chapter': '#fbbf24',
  preprint: '#34d399', 'conference-paper': '#f472b6', book: '#e879f9',
}
function typeColor(t: string) { return TYPE_COLOR[t] || 'rgba(240,232,208,0.45)' }
function pretty(t: string) { return (t || 'article').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }

export default function ProfilePage() {
  useSessionGuard()
  const router = useRouter()

  const [email, setEmail]             = useState('')
  const [displayName, setDisplayName] = useState('')
  const [orcid, setOrcid]             = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [website, setWebsite]   = useState('')
  const [scholar, setScholar]   = useState('')
  const [linkedin, setLinkedin] = useState('')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const [data, setData]         = useState<OrcidData | null>(null)
  const [oa, setOa]             = useState<OAData | null>(null)
  const [orcidErr, setOrcidErr] = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [showAllWorks, setShowAllWorks] = useState(false)
  const [sortBy, setSortBy] = useState<'year' | 'cited'>('year')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const u = session?.user
      if (!u || !session) { router.push('/login'); return }
      setEmail(u.email || '')
      setAccessToken(session.access_token)
      const meta = u.user_metadata || {}
      setDisplayName((meta.full_name as string) || (meta.name as string) || '')
      setWebsite((meta.website as string) || '')
      setScholar((meta.google_scholar as string) || '')
      setLinkedin((meta.linkedin as string) || '')
      const savedOrcid = (meta.orcid as string) || ''
      setOrcid(savedOrcid)
      if (savedOrcid) { fetchOrcid(savedOrcid, session.access_token); fetchOpenAlex(savedOrcid, u.email || '') }
    }
    load()
  }, [])

  const fetchOrcid = async (id: string, token: string) => {
    setLoading(true)
    setOrcidErr(null)
    try {
      const res = await fetch(`/api/orcid?id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } })
      const d = await res.json()
      if (!res.ok) { setOrcidErr(d.error || 'Could not load ORCID profile'); setData(null) }
      else setData(d)
    } catch { setOrcidErr('Could not load ORCID profile') }
    finally { setLoading(false) }
  }

  // OpenAlex: author bibliometrics + full works (free, public)
  const fetchOpenAlex = async (id: string, mailto: string) => {
    try {
      const m = encodeURIComponent(mailto || 'app@researchdesk')
      const aRes = await fetch(`https://api.openalex.org/authors/orcid:${id}?mailto=${m}`)
      if (!aRes.ok) { setOa(null); return }
      const a = await aRes.json()
      const aid = String(a.id || '').split('/').pop()
      const displayName: string = a.display_name || ''

      const byYear: ByYear[] = (a.counts_by_year || [])
        .map((c: any) => ({ year: c.year, works: c.works_count || 0, citations: c.cited_by_count || 0 }))
        .filter((c: ByYear) => c.works || c.citations)
      const fields: string[] = (a.x_concepts || []).slice(0, 8).map((c: any) => c.display_name).filter(Boolean)

      // full works
      let pubs: Pub[] = []
      if (aid) {
        const wRes = await fetch(`https://api.openalex.org/works?filter=author.id:${aid}&per-page=100&sort=publication_date:desc&mailto=${m}`)
        if (wRes.ok) {
          const w = await wRes.json()
          pubs = (w.results || []).map((r: any) => ({
            title: r.title || r.display_name || 'Untitled',
            year: r.publication_year || 0,
            citations: r.cited_by_count || 0,
            type: r.type || 'article',
            venue: r.primary_location?.source?.display_name || '',
            doi: (r.doi || '').replace('https://doi.org/', ''),
            authors: (r.authorships || []).map((au: any) => au.author?.display_name).filter(Boolean),
          })).filter((p: Pub) => p.title)
        }
      }

      // aggregates
      const coMap = new Map<string, number>()
      const veMap = new Map<string, number>()
      const tyMap = new Map<string, number>()
      const selfLast = displayName.split(' ').pop()?.toLowerCase() || ''
      pubs.forEach(p => {
        if (p.venue) veMap.set(p.venue, (veMap.get(p.venue) || 0) + 1)
        tyMap.set(p.type, (tyMap.get(p.type) || 0) + 1)
        p.authors.forEach(au => {
          if (au.toLowerCase() === displayName.toLowerCase()) return
          if (selfLast && au.toLowerCase().includes(selfLast)) return
          coMap.set(au, (coMap.get(au) || 0) + 1)
        })
      })
      const top = (m2: Map<string, number>, n: number) => Array.from(m2.entries()).map(([name, count]) => ({ name, count })).sort((x, y) => y.count - x.count).slice(0, n)

      setOa({
        metrics: { worksCount: a.works_count || 0, citations: a.cited_by_count || 0, hIndex: a.summary_stats?.h_index || 0, i10Index: a.summary_stats?.i10_index || 0 },
        byYear, fields,
        coauthors: top(coMap, 8), venues: top(veMap, 5),
        workTypes: top(tyMap, 8),
        pubs, authorUrl: a.id || '', displayName,
      })
    } catch { setOa(null) }
  }

  const handleSave = async () => {
    setError(null); setSaved(false)
    const t = orcid.trim()
    if (t && !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(t)) { setError('Invalid ORCID format. Use 0000-0000-0000-0000'); return }
    setSaving(true)
    try {
      const { error: upErr } = await supabase.auth.updateUser({ data: { full_name: displayName.trim(), orcid: t, website: website.trim(), google_scholar: scholar.trim(), linkedin: linkedin.trim() } })
      if (upErr) throw upErr
      setOrcid(t); setSaved(true); setTimeout(() => setSaved(false), 2500)
      if (t) { fetchOrcid(t, accessToken); fetchOpenAlex(t, email) } else { setData(null); setOa(null) }
    } catch { setError('Could not save. Please try again.') }
    finally { setSaving(false) }
  }

  const signOut = async () => { localStorage.removeItem('rd_browser_open'); await supabase.auth.signOut(); router.push('/') }

  const initials = displayName ? displayName[0].toUpperCase() : (email ? email[0].toUpperCase() : '?')

  // derived
  const pubs = oa?.pubs?.length ? oa.pubs : (data?.works || []).map(w => ({ title: w.title, year: parseInt(w.year) || 0, citations: 0, type: w.type || 'article', venue: w.journal, doi: w.doi, authors: [] as string[] }))
  const sortedPubs = [...pubs].sort((a, b) => sortBy === 'cited' ? b.citations - a.citations : b.year - a.year)
  const worksToShow = showAllWorks ? sortedPubs : sortedPubs.slice(0, WORKS_PREVIEW)
  const years = pubs.map(p => p.year).filter(Boolean)
  const yearSpan = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : ''
  const statsReady = !!(oa || data)
  const role = data?.role || ''
  const fields = Array.from(new Set([...(data?.keywords || []), ...(oa?.fields || [])])).slice(0, 10)

  const links = [
    website  && { label: 'Website', href: website.startsWith('http') ? website : `https://${website}` },
    scholar  && { label: 'Google Scholar', href: scholar.startsWith('http') ? scholar : `https://${scholar}` },
    linkedin && { label: 'LinkedIn', href: linkedin.startsWith('http') ? linkedin : `https://${linkedin}` },
    ...(data?.links || []).map(l => ({ label: l.name, href: l.url })),
    oa?.authorUrl && { label: 'OpenAlex', href: oa.authorUrl },
  ].filter(Boolean) as { label: string; href: string }[]

  return (
    <div className="workspace-layout" style={{ background: '#080c18', fontFamily: inter, color: '#f0e8d0' }}>

      {/* ── SIDEBAR ── */}
      <aside className="workspace-sidebar">
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(201,148,58,0.6), transparent)' }}/>
        <div style={{ padding: '0 24px 32px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.webp" alt="R" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(201,148,58,0.2)' }} />
            <span style={{ fontSize: 17, fontWeight: 700, fontFamily: cinzel, letterSpacing: '0.02em' }}>
              <span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span>
            </span>
          </Link>
        </div>
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((item) => {
            const active = item.href === '/profile'
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: active ? 'rgba(201,148,58,0.12)' : 'transparent', color: active ? '#c9943a' : 'rgba(240,232,208,0.5)', fontSize: 14, fontWeight: active ? 600 : 400, border: active ? '1px solid rgba(201,148,58,0.25)' : '1px solid transparent', transition: 'all 0.18s' }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color='rgba(240,232,208,0.8)' } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='rgba(240,232,208,0.5)' } }}>
                  <span style={{ fontSize: 15, opacity: active ? 1 : 0.6, color: active ? '#c9943a' : 'inherit' }}>{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            )
          })}
        </nav>
        <div className="workspace-sidebar-bottom" style={{ padding: '20px 16px 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 16 }}>
          <Link href="/profile" title="View your profile" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, textDecoration: 'none', padding: '6px', margin: '-6px -6px 6px', borderRadius: 10, transition: 'background 0.18s' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.04)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background='transparent')}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #c9943a, #8b6914)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#080c18', flexShrink: 0, boxShadow: '0 0 12px rgba(201,148,58,0.3)' }}>{initials}</div>
            <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
          </Link>
          <button onClick={signOut} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: 'rgba(240,232,208,0.35)', fontSize: 12, cursor: 'pointer', transition: 'all 0.18s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(248,113,113,0.25)'; (e.currentTarget as HTMLElement).style.color='rgba(248,113,113,0.7)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color='rgba(240,232,208,0.35)' }}
          >Sign out</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="workspace-content" style={{ overflowY: 'auto', background: '#080c18', position: 'relative' }}>
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-8%', left: '32%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,148,58,0.08) 0%, transparent 65%)', animation: 'pfAurora 13s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '38%', right: '-6%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 65%)', animation: 'pfAurora 17s ease-in-out infinite reverse' }} />
          <div style={{ position: 'absolute', bottom: '6%', left: '6%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.05) 0%, transparent 65%)', animation: 'pfAurora 21s ease-in-out infinite' }} />
        </div>
        <FloatingIcons />

        <div style={{ maxWidth: 840, margin: '0 auto', position: 'relative', zIndex: 1 }}>

          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12, fontFamily: cinzel }}>✦ &nbsp; Profile</p>
            <h1 style={{ fontSize: 38, fontWeight: 600, color: '#f0e8d0', margin: 0, fontFamily: cinzel, lineHeight: 1.1 }}>Your Researcher Profile</h1>
            <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(201,148,58,0.35), transparent)', marginTop: 24 }}/>
          </div>

          {/* Identity */}
          <div style={{ position: 'relative', overflow: 'hidden', padding: '28px', borderRadius: 18, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,148,58,0.15)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap', animation: 'pfFadeUp 0.5s both' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(201,148,58,0.7), transparent)' }} />
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'linear-gradient(135deg, #c9943a, #8b6914)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#080c18', flexShrink: 0, animation: 'pfAvatarGlow 3.5s ease-in-out infinite', fontFamily: cinzel }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ fontSize: 25, fontWeight: 700, color: '#f0e8d0', margin: '0 0 3px', fontFamily: cinzel }}>{displayName || data?.name || 'Add your name below'}</p>
              {(role || data?.affiliation) && <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.55)', margin: '0 0 6px' }}>{[role, data?.affiliation].filter(Boolean).join(' · ')}{data?.country ? ` · ${data.country}` : ''}</p>}
              <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.4)', margin: '0 0 10px' }}>{email}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {orcid && (
                  <a href={data?.profileUrl || `https://orcid.org/${orcid}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '3px 10px 3px 4px', borderRadius: 99, background: 'rgba(166,206,57,0.08)', border: '1px solid rgba(166,206,57,0.25)', textDecoration: 'none' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: '#a6ce39', color: '#fff', fontSize: 9, fontWeight: 800, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>iD</span>
                    <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.6)', fontFamily: "'Courier New', monospace" }}>orcid.org/{orcid}</span>
                  </a>
                )}
                {(data?.externalIds || []).map((e, i) => (
                  <a key={i} href={e.url || '#'} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: '4px 11px', borderRadius: 99, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.22)', color: 'rgba(240,232,208,0.6)', textDecoration: 'none' }}>{e.type}: {e.value}</a>
                ))}
              </div>
              {links.length > 0 && (
                <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
                  {links.map((l, i) => (
                    <a key={i} href={l.href} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'rgba(201,148,58,0.7)', textDecoration: 'none', borderBottom: '1px solid rgba(201,148,58,0.25)', paddingBottom: 1 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#c9943a')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,148,58,0.7)')}>{l.label} ↗</a>
                  ))}
                </div>
              )}
              {data?.otherNames?.length ? <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: '10px 0 0' }}>Also published as: {data.otherNames.join(', ')}</p> : null}
            </div>
          </div>

          {/* Metrics */}
          {orcid && statsReady && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <StatCard value={oa ? oa.metrics.worksCount : pubs.length} label="Publications" accent="#c9943a" delay={0} animate={statsReady} />
              {oa && <StatCard value={oa.metrics.citations} label="Citations" accent="#34d399" delay={0.06} animate={statsReady} />}
              {oa && <StatCard value={oa.metrics.hIndex} label="h-index" accent="#60a5fa" delay={0.12} animate={statsReady} />}
              {oa && <StatCard value={oa.metrics.i10Index} label="i10-index" accent="#a78bfa" delay={0.18} animate={statsReady} />}
              {oa && oa.coauthors.length > 0 && <StatCard value={oa.coauthors.length} label="Co-authors" accent="#f472b6" delay={0.24} animate={statsReady} />}
              {yearSpan && <StatCard value={yearSpan} label="Years Active" accent="#fbbf24" delay={0.3} animate={statsReady} />}
            </div>
          )}

          {/* Output & impact */}
          {orcid && oa?.byYear?.length ? <div style={{ marginBottom: 20, animation: 'pfFadeUp 0.55s 0.15s both' }}><OutputChart byYear={oa.byYear} /></div> : null}

          {/* Research fields */}
          {fields.length ? (
            <Section title="Research Fields">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {fields.map((k, i) => (
                  <span key={i} style={{ fontSize: 12, padding: '5px 13px', borderRadius: 99, background: 'rgba(201,148,58,0.07)', border: '1px solid rgba(201,148,58,0.2)', color: 'rgba(240,232,208,0.72)' }}>{k}</span>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Bio */}
          {data?.bio && (
            <Section title="Biography">
              <div style={cardStyle}><p style={{ fontSize: 14, color: 'rgba(240,232,208,0.7)', margin: 0, lineHeight: 1.7 }}>{data.bio}</p></div>
            </Section>
          )}

          {/* Education + Employment */}
          {(data?.employments?.length || data?.educations?.length) ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 22 }}>
              {data?.employments?.length ? (
                <Section title="Employment">
                  <TimelineList accent="rgba(201,148,58,0.3)" items={data.employments.map(e => ({ primary: e.role || 'Researcher', secondary: [e.department, e.organization].filter(Boolean).join(', '), meta: (e.startYear || e.endYear) ? `${e.startYear || '?'} – ${e.endYear || 'Present'}` : '' }))} />
                </Section>
              ) : null}
              {data?.educations?.length ? (
                <Section title="Education">
                  <TimelineList accent="rgba(167,139,250,0.3)" items={data.educations.map(e => ({ primary: e.role || 'Degree', secondary: e.organization, meta: (e.startYear || e.endYear) ? `${e.startYear || '?'} – ${e.endYear || 'Present'}` : '' }))} />
                </Section>
              ) : null}
            </div>
          ) : null}

          {/* Qualifications */}
          {data?.qualifications?.length ? (
            <Section title="Qualifications">
              <TimelineList accent="rgba(52,211,153,0.3)" items={data.qualifications.map(e => ({ primary: e.role || 'Qualification', secondary: e.organization, meta: e.endYear || e.startYear }))} />
            </Section>
          ) : null}

          {/* Funding */}
          {data?.fundings?.length ? (
            <Section title="Grants & Funding">
              <TimelineList accent="rgba(96,165,250,0.3)" items={data.fundings.map(f => ({ primary: f.title || 'Grant', secondary: [f.organization, f.type].filter(Boolean).join(' · '), meta: (f.startYear || f.endYear) ? `${f.startYear || '?'} – ${f.endYear || ''}` : '' }))} />
            </Section>
          ) : null}

          {/* Awards */}
          {data?.distinctions?.length ? (
            <Section title="Awards & Distinctions">
              <TimelineList accent="rgba(251,191,36,0.35)" items={data.distinctions.map(e => ({ primary: e.role || 'Distinction', secondary: e.organization, meta: e.startYear || e.endYear }))} />
            </Section>
          ) : null}

          {/* Service / memberships / invited / peer review */}
          {(data?.memberships?.length || data?.services?.length || data?.invitedPositions?.length || (data?.peerReviewCount || 0) > 0) ? (
            <Section title="Professional Activities">
              <div style={cardStyle}>
                {(data?.peerReviewCount || 0) > 0 && <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.7)', margin: '0 0 10px' }}>🔍 <span style={{ fontFamily: playfair, fontVariantNumeric: 'lining-nums', color: '#c9943a', fontWeight: 600 }}>{data!.peerReviewCount}</span> peer reviews completed</p>}
                {[...(data?.memberships || []), ...(data?.services || []), ...(data?.invitedPositions || [])].map((e, i) => (
                  <p key={i} style={{ fontSize: 13, color: 'rgba(240,232,208,0.65)', margin: '0 0 6px' }}>• {[e.role, e.organization].filter(Boolean).join(', ')}</p>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Co-authors + Venues */}
          {(oa?.coauthors?.length || oa?.venues?.length) ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 22 }}>
              {oa?.coauthors?.length ? (
                <Section title="Frequent Co-authors">
                  <div style={cardStyle}>
                    {oa.coauthors.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < oa.coauthors.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <span style={{ fontSize: 13, color: 'rgba(240,232,208,0.75)' }}>{c.name}</span>
                        <span style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', fontFamily: playfair, fontVariantNumeric: 'lining-nums' }}>{c.count}×</span>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}
              {oa?.venues?.length ? (
                <Section title="Top Journals">
                  <div style={cardStyle}>
                    {oa.venues.map((v, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < oa.venues.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <span style={{ fontSize: 13, color: 'rgba(240,232,208,0.75)', fontStyle: 'italic' }}>{v.name}</span>
                        <span style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', fontFamily: playfair, fontVariantNumeric: 'lining-nums' }}>{v.count}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}
            </div>
          ) : null}

          {/* Edit details */}
          <div style={{ padding: '24px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,148,58,0.15)', marginBottom: 24 }}>
            <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, margin: '0 0 18px' }}>Edit details</p>
            <label style={{ fontSize: 12, color: 'rgba(240,232,208,0.5)', display: 'block', marginBottom: 6 }}>Display name</label>
            <input value={displayName} onChange={e => { setDisplayName(e.target.value); setSaved(false) }} placeholder="e.g. Dr. Sparsh Dixit"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,148,58,0.2)', borderRadius: 9, color: '#f0e8d0', fontSize: 14, outline: 'none', fontFamily: inter, marginBottom: 16 }} />
            <label style={{ fontSize: 12, color: 'rgba(240,232,208,0.5)', display: 'block', marginBottom: 6 }}>ORCID iD</label>
            <input value={orcid} onChange={e => { setOrcid(e.target.value); setError(null); setSaved(false) }} placeholder="0000-0000-0000-0000"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${error ? 'rgba(248,71,71,0.4)' : 'rgba(201,148,58,0.2)'}`, borderRadius: 9, color: '#f0e8d0', fontSize: 14, outline: 'none', fontFamily: inter, letterSpacing: '0.04em', marginBottom: 16 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div><label style={{ fontSize: 12, color: 'rgba(240,232,208,0.5)', display: 'block', marginBottom: 6 }}>Personal website</label>
                <input value={website} onChange={e => { setWebsite(e.target.value); setSaved(false) }} placeholder="yoursite.com" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,148,58,0.2)', borderRadius: 9, color: '#f0e8d0', fontSize: 14, outline: 'none', fontFamily: inter }} /></div>
              <div><label style={{ fontSize: 12, color: 'rgba(240,232,208,0.5)', display: 'block', marginBottom: 6 }}>Google Scholar</label>
                <input value={scholar} onChange={e => { setScholar(e.target.value); setSaved(false) }} placeholder="scholar.google.com/citations?user=…" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,148,58,0.2)', borderRadius: 9, color: '#f0e8d0', fontSize: 14, outline: 'none', fontFamily: inter }} /></div>
              <div><label style={{ fontSize: 12, color: 'rgba(240,232,208,0.5)', display: 'block', marginBottom: 6 }}>LinkedIn</label>
                <input value={linkedin} onChange={e => { setLinkedin(e.target.value); setSaved(false) }} placeholder="linkedin.com/in/…" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,148,58,0.2)', borderRadius: 9, color: '#f0e8d0', fontSize: 14, outline: 'none', fontFamily: inter }} /></div>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: '14px 0 0' }}>Your CV (education, employment, awards, funding) comes from ORCID. Citation metrics, fields & co-authors come from OpenAlex.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
              <button onClick={handleSave} disabled={saving} style={{ padding: '10px 26px', borderRadius: 10, background: 'linear-gradient(135deg, #c9943a, #e8b84a)', color: '#080c18', fontSize: 13, fontWeight: 700, border: 'none', cursor: saving ? 'default' : 'pointer', fontFamily: inter }}>{saving ? 'Saving…' : 'Save changes'}</button>
              {error && <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span>}
              {saved && <span style={{ fontSize: 12, color: '#34d399' }}>✓ Saved</span>}
            </div>
          </div>

          {/* Publications */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a6ce39', boxShadow: '0 0 6px #a6ce39' }} />
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f0e8d0', margin: 0, fontFamily: cinzel }}>Publications{pubs.length ? ` (${pubs.length})` : ''}</h2>
              </div>
              {pubs.length > 1 && (
                <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {(['year', 'cited'] as const).map(s => (
                    <button key={s} onClick={() => setSortBy(s)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: inter, background: sortBy === s ? 'rgba(201,148,58,0.15)' : 'transparent', color: sortBy === s ? '#c9943a' : 'rgba(240,232,208,0.4)' }}>{s === 'year' ? 'Newest' : 'Most cited'}</button>
                  ))}
                </div>
              )}
            </div>

            {!orcid ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(240,232,208,0.25)', fontSize: 13, borderRadius: 14, border: '1px dashed rgba(255,255,255,0.06)' }}>Add your ORCID iD above to display your publications.</div>
            ) : loading && !pubs.length ? (
              <div className="skel" style={{ height: 80, borderRadius: 14 }} />
            ) : orcidErr && !pubs.length ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(240,232,208,0.3)', fontSize: 13, borderRadius: 14, border: '1px dashed rgba(255,255,255,0.06)' }}>{orcidErr}</div>
            ) : !pubs.length ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(240,232,208,0.2)', fontSize: 13, borderRadius: 14, border: '1px dashed rgba(255,255,255,0.06)' }}>No public works found.</div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {worksToShow.map((w, i) => {
                    const href = w.doi ? `https://doi.org/${w.doi}` : (data?.profileUrl || `https://orcid.org/${orcid}`)
                    return (
                      <a key={i} href={href} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', borderRadius: 14, textDecoration: 'none', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.18s', animation: `pfFadeUp 0.4s ${Math.min(i * 0.03, 0.4)}s both` }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(201,148,58,0.05)'; (e.currentTarget as HTMLElement).style.borderColor='rgba(201,148,58,0.2)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'; (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: 11, color: 'rgba(201,148,58,0.3)', fontWeight: 700, fontFamily: "'Courier New', monospace", minWidth: 20, paddingTop: 2, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(240,232,208,0.85)', margin: '0 0 6px', lineHeight: 1.45 }}>{w.title}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.04em', background: `${typeColor(w.type)}1f`, color: typeColor(w.type) }}>{pretty(w.type)}</span>
                            {w.venue && <span style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>{w.venue}</span>}
                            {w.authors.length > 0 && <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)' }}>· {w.authors.length} authors</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                          {w.year ? <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'rgba(240,232,208,0.5)', whiteSpace: 'nowrap', fontFamily: playfair, fontVariantNumeric: 'lining-nums' }}>{w.year}</span> : null}
                          {w.citations > 0 && <span style={{ fontSize: 10, color: 'rgba(52,211,153,0.7)', whiteSpace: 'nowrap', fontFamily: playfair, fontVariantNumeric: 'lining-nums' }}>{w.citations} cited</span>}
                        </div>
                      </a>
                    )
                  })}
                </div>
                {pubs.length > WORKS_PREVIEW && (
                  <button onClick={() => setShowAllWorks(v => !v)} style={{ marginTop: 12, padding: '9px 20px', borderRadius: 9, background: 'rgba(201,148,58,0.07)', border: '1px solid rgba(201,148,58,0.2)', color: '#c9943a', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: inter }}>
                    {showAllWorks ? 'Show less' : `Show all ${pubs.length} publications`}
                  </button>
                )}
              </>
            )}
          </div>

        </div>
      </main>

      <style>{`
        @keyframes pfFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pfNode { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes pfAurora { 0%, 100% { transform: translate(0,0) scale(1); } 33% { transform: translate(26px,-18px) scale(1.08); } 66% { transform: translate(-18px,14px) scale(0.95); } }
        @keyframes pfSkel { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes pfAvatarGlow { 0%, 100% { box-shadow: 0 0 18px rgba(201,148,58,0.3); } 50% { box-shadow: 0 0 30px rgba(201,148,58,0.55); } }
        .skel { background: rgba(255,255,255,0.07); animation: pfSkel 1.6s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
