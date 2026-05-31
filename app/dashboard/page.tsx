'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LiveClock from '@/lib/components/dashboard/LiveClock'
import PubMedFeed from '@/lib/components/dashboard/PubMedFeed'
import WorkflowGuide from '@/lib/components/dashboard/WorkflowGuide'

const NAV = [
  { label: 'Overview',    icon: '◈', href: '/dashboard' },
  { label: 'Projects',    icon: '⬡', href: '/projects' },
  { label: 'New Project', icon: '+', href: '/new-project' },
  { label: 'Settings',    icon: '⚙', href: '/settings' },
]

const STUDY_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  'Case Report':       { color: '#c9943a',  bg: 'rgba(201,148,58,0.1)',  border: 'rgba(201,148,58,0.25)' },
  'Thesis':            { color: '#a78bfa',  bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
  'Review Article':    { color: '#60a5fa',  bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)' },
  'Original Study':    { color: '#34d399',  bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
  'Meta-Analysis':     { color: '#fbbf24',  bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  'Case Series':       { color: '#fb923c',  bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)' },
  'Systematic Review': { color: '#34d399',  bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
  'Audit':             { color: '#e879f9',  bg: 'rgba(232,121,249,0.1)', border: 'rgba(232,121,249,0.25)' },
  'Letter to Editor':  { color: '#f0e8d0',  bg: 'rgba(240,232,208,0.07)',border: 'rgba(240,232,208,0.15)' },
}
const DEFAULT_COLOR = { color: 'rgba(240,232,208,0.5)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)' }

/* animated counter */
function useCounter(target: number, duration = 900, trigger = false) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!trigger) return
    let raf: number
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      setV(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [trigger, target, duration])
  return v
}

export default function DashboardPage() {
  const [email, setEmail]       = useState('')
  const [displayName, setDisplayName] = useState('')
  const [projects, setProjects] = useState<any[]>([])
  const [sectionsCount, setSectionsCount] = useState(0)
  const [loaded, setLoaded]     = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const router = useRouter()

  /* counter trigger once data loads */
  const cnt     = useCounter(projects.length, 800, loaded)
  const cntSec  = useCounter(sectionsCount, 900, loaded)

  useEffect(() => { checkUser(); fetchProjects() }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setEmail(user.email || '')
    // Google OAuth stores full name in user_metadata
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || ''
    const firstName = fullName ? fullName.split(' ')[0] : (user.email?.split('@')[0] || '')
    setDisplayName(firstName)
  }

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setProjects(data || [])
    const { count: secCount } = await supabase.from('project_sections').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    setSectionsCount(secCount || 0)
    setLoaded(true)
    // Show onboarding if user has never dismissed it
    const dismissed = localStorage.getItem('rd_onboarding_dismissed')
    if (!dismissed) setShowOnboarding(true)
  }

  const signOut = async () => { await supabase.auth.signOut(); router.push('/') }

  const initials = displayName ? displayName[0].toUpperCase() : (email ? email[0].toUpperCase() : '?')

  /* greeting by time */
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  /* card tilt */
  const tiltCard = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width  - 0.5
    const y = (e.clientY - r.top)  / r.height - 0.5
    e.currentTarget.style.transform = `perspective(700px) rotateY(${x*10}deg) rotateX(${-y*7}deg) translateY(-4px)`
    e.currentTarget.style.borderColor = 'rgba(201,148,58,0.35)'
    e.currentTarget.style.boxShadow   = '0 20px 50px rgba(0,0,0,0.5), 0 0 20px rgba(201,148,58,0.08)'
  }
  const resetCard = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform  = ''
    e.currentTarget.style.borderColor= 'rgba(255,255,255,0.08)'
    e.currentTarget.style.boxShadow  = 'none'
  }

  return (
    <div className="workspace-layout" style={{ background: '#080c18', fontFamily: "var(--font-inter), 'DM Sans', system-ui, sans-serif", color: '#f0e8d0' }}>

      {/* ── SIDEBAR ─────────────────────────────── */}
      <aside className="workspace-sidebar">
        {/* Gold top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(201,148,58,0.6), transparent)' }}/>

        <div style={{ padding: '0 24px 32px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.webp" alt="R" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(201,148,58,0.2)' }} />
            <span style={{ fontSize: 17, fontWeight: 700, fontFamily: "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif", letterSpacing: '0.02em' }}>
              <span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span>
            </span>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((item) => {
            const active = item.href === '/dashboard'
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 10,
                    background: active ? 'rgba(201,148,58,0.12)' : 'transparent',
                    color: active ? '#c9943a' : 'rgba(240,232,208,0.5)',
                    fontSize: 14, fontWeight: active ? 600 : 400,
                    border: active ? '1px solid rgba(201,148,58,0.25)' : '1px solid transparent',
                    transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color='rgba(240,232,208,0.8)' } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='rgba(240,232,208,0.5)' } }}
                >
                  <span style={{ fontSize: 15, opacity: active ? 1 : 0.6, color: active ? '#c9943a' : 'inherit' }}>{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="workspace-sidebar-bottom" style={{ padding: '20px 16px 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #c9943a, #8b6914)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#080c18', flexShrink: 0,
              boxShadow: '0 0 12px rgba(201,148,58,0.3)',
            }}>{initials}</div>
            <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
          </div>
          <button
            onClick={signOut}
            style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: 'rgba(240,232,208,0.35)', fontSize: 12, cursor: 'pointer', transition: 'all 0.18s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(248,113,113,0.25)'; (e.currentTarget as HTMLElement).style.color='rgba(248,113,113,0.7)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color='rgba(240,232,208,0.35)' }}
          >Sign out</button>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────── */}
      <main className="workspace-content" style={{ overflowY: 'auto', position: 'relative' }}>

        {/* Subtle background glow */}
        <div style={{ position: 'fixed', top: '20%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,148,58,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }}/>

        <div style={{ position: 'relative', zIndex: 1 }}>
        {!loaded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* skeleton clock */}
            <div className="skel" style={{ height: 28, width: 220, borderRadius: 8 }} />
            {/* skeleton stat cards */}
            <div className="grid-3 dashboard-grid" style={{ gap: 16 }}>
              {[1,2,3].map(i => <div key={i} className="skel" style={{ height: 110, borderRadius: 18 }} />)}
            </div>
            {/* skeleton project cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} className="skel" style={{ height: 96, borderRadius: 16 }} />)}
            </div>
          </div>
        )}

          {/* ── HEADER ── */}
          {loaded && <div className="stats-row" style={{ marginBottom: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', marginBottom: 8, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>
                ✦ &nbsp; Dashboard
              </p>
              <h1 style={{ fontSize: 36, fontWeight: 600, color: '#f0e8d0', margin: 0, letterSpacing: '0.01em', fontFamily: "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif", lineHeight: 1.1 }}>
                {greeting}{displayName ? `,` : ''}<br/>
                <span style={{ color: '#c9943a' }}>{displayName}</span>
              </h1>
            </div>
            <Link href="/new-project" style={{
              textDecoration: 'none', fontSize: 13, fontWeight: 700,
              color: '#080c18', padding: '11px 24px', borderRadius: 10,
              background: 'linear-gradient(135deg, #c9943a, #e8b84a)',
              boxShadow: '0 4px 24px rgba(201,148,58,0.3)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 7,
              fontFamily: "var(--font-inter), sans-serif",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 8px 32px rgba(201,148,58,0.45)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow='0 4px 24px rgba(201,148,58,0.3)' }}
            >
              <span style={{ fontSize: 16 }}>+</span> New Project
            </Link>
          </div>}

        {loaded && <>

          {/* ── WORKFLOW GUIDE ── */}
          <WorkflowGuide />

          {/* ── ONBOARDING BANNER ── */}
          {showOnboarding && (
            <div style={{ marginBottom: 28, padding: '22px 28px', borderRadius: 18, background: 'linear-gradient(135deg, rgba(201,148,58,0.08), rgba(201,148,58,0.03))', border: '1px solid rgba(201,148,58,0.25)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(201,148,58,0.6), transparent)' }} />
              <button onClick={() => { setShowOnboarding(false); localStorage.setItem('rd_onboarding_dismissed', '1') }} style={{ position: 'absolute', top: 14, right: 16, background: 'transparent', border: 'none', color: 'rgba(240,232,208,0.3)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
              <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px', fontWeight: 700 }}>✦ Getting Started</p>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f0e8d0', margin: '0 0 16px', fontFamily: "var(--font-cinzel),'Cormorant Garamond',Georgia,serif" }}>Welcome to ResearchDesk — here's what to do next</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {[
                  { step: '1', icon: '📁', title: 'Open a project', desc: 'Click any project card below to open its workspace', href: null },
                  { step: '2', icon: '✍️', title: 'Write your manuscript', desc: 'Select a section from the sidebar and start writing', href: null },
                  { step: '3', icon: '✦', title: 'Use AI Review', desc: 'Click "Review with AI" to get instant section feedback', href: null },
                  { step: '4', icon: '⬇', title: 'Export to Word', desc: 'Click Export to download your manuscript as a .docx file', href: null },
                ].map(s => (
                  <div key={s.step} style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,148,58,0.12)', border: '1px solid rgba(201,148,58,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#c9943a', fontWeight: 700, flexShrink: 0 }}>{s.step}</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#f0e8d0', margin: '0 0 3px' }}>{s.icon} {s.title}</p>
                      <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.4)', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => { setShowOnboarding(false); localStorage.setItem('rd_onboarding_dismissed', '1') }} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, background: 'rgba(201,148,58,0.12)', border: '1px solid rgba(201,148,58,0.25)', color: '#c9943a', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Got it, let's go →
              </button>
            </div>
          )}

          {/* ── LIVE CLOCK ── */}
          <LiveClock />

          {/* ── STAT CARDS ── */}
          <div className="grid-3 dashboard-grid" style={{ gap: 16, marginBottom: 40 }}>
            {[
              { label: 'Active Projects',  value: cnt,                  icon: '⬡', color: '#c9943a',  glow: 'rgba(201,148,58,0.12)',  border: 'rgba(201,148,58,0.2)' },
              { label: 'Sections Written', value: cntSec,               icon: '✦', color: '#a78bfa',  glow: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.18)' },
              { label: 'Total Workspaces', value: cnt,                   icon: '◉', color: '#60a5fa',  glow: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.18)' },
            ].map((s) => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.025)',
                border: `1px solid ${s.border}`,
                borderRadius: 18, padding: '24px 26px',
                position: 'relative', overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow=`0 12px 40px rgba(0,0,0,0.4), 0 0 24px ${s.glow}` }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow='' }}
              >
                {/* glow blob */}
                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: `radial-gradient(circle, ${s.glow} 0%, transparent 70%)`, pointerEvents: 'none' }}/>
                {/* top accent line */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${s.color}55, transparent)` }}/>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 42, fontWeight: 800, color: s.color, lineHeight: 1, fontFamily: "var(--font-cinzel), 'Cormorant Garamond', serif" }}>
                    {s.value}
                  </div>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `rgba(${s.color === '#c9943a' ? '201,148,58' : s.color === '#a78bfa' ? '167,139,250' : '96,165,250'},0.12)`,
                    border: `1px solid ${s.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, color: s.color,
                  }}>{s.icon}</div>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(240,232,208,0.4)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── PROJECTS ── */}
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#f0e8d0', margin: 0, fontFamily: "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif" }}>Your Projects</h2>
              <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.3)', margin: '4px 0 0' }}>{projects.length} workspace{projects.length !== 1 ? 's' : ''} total</p>
            </div>
            <Link href="/projects" style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', textDecoration: 'none', letterSpacing: '0.04em',
              transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#c9943a')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,232,208,0.35)')}
            >View all →</Link>
          </div>

          {projects.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(201,148,58,0.15)',
              borderRadius: 20, padding: '60px 40px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.2 }}>⬡</div>
              <p style={{ color: 'rgba(240,232,208,0.35)', fontSize: 14, marginBottom: 20 }}>No projects yet. Start your first research workspace.</p>
              <Link href="/new-project" style={{
                textDecoration: 'none', display: 'inline-block',
                background: 'linear-gradient(135deg, #c9943a, #e8b84a)',
                color: '#080c18', fontWeight: 700, fontSize: 13,
                padding: '11px 26px', borderRadius: 10,
              }}>Create Project</Link>
            </div>
          ) : (
            <div className="grid-auto" style={{ gap: 14 }}>
              {projects.map((p, idx) => {
                const badge = STUDY_COLORS[p.study_type] || DEFAULT_COLOR
                return (
                  <Link key={p.id} href={`/workspace/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div
                      onMouseMove={tiltCard}
                      onMouseLeave={resetCard}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 16, padding: '20px 22px',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, border-color 0.2s, box-shadow 0.2s',
                        position: 'relative', overflow: 'hidden',
                        // staggered fade-in
                        animation: `fadeInUp 0.4s ${idx * 0.06}s both`,
                      }}>
                      {/* top tint line matching study type */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${badge.color}55, transparent)` }}/>

                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10,
                          background: badge.bg, border: `1px solid ${badge.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                        }}>📄</div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                          background: 'rgba(52,211,153,0.1)', color: '#34d399',
                          border: '1px solid rgba(52,211,153,0.2)', letterSpacing: '0.04em',
                        }}>Active</span>
                      </div>

                      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f0e8d0', marginBottom: 6, lineHeight: 1.4, textTransform: 'capitalize' }}>{p.title}</h3>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                          background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                        }}>{p.study_type || 'Research'}</span>
                        <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.25)' }}>
                          {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ marginTop: 12, padding: '7px 14px', borderRadius: 8, background: 'rgba(201,148,58,0.07)', border: '1px solid rgba(201,148,58,0.15)', textAlign: 'center', fontSize: 12, color: 'rgba(201,148,58,0.7)', fontWeight: 600, letterSpacing: '0.03em' }}>
                        Open Workspace →
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* PubMed Feed */}
          <PubMedFeed />

          {/* Quick tip */}
          {projects.length > 0 && (
            <div style={{ marginTop: 28, padding: '14px 20px', background: 'rgba(201,148,58,0.04)', border: '1px solid rgba(201,148,58,0.12)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, opacity: 0.7 }}>💡</span>
              <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.4)', margin: 0 }}>
                Open a project to see its readiness score, manuscript progress, and AI reviewer feedback.
              </p>
            </div>
          )}
        </>}
        </div>
      </main>


      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes skelPulse {
          0%, 100% { opacity: 0.04; }
          50%       { opacity: 0.09; }
        }
        .skel {
          background: rgba(240,232,208,1);
          animation: skelPulse 1.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
