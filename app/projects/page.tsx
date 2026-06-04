'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { openRazorpayCheckout } from '@/lib/hooks/useRazorpay'

interface Project { id: number; title: string; study_type: string; user_id: string; created_at: string }

const STUDY_META: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  'Case Report':       { color: '#c9943a',  bg: 'rgba(201,148,58,0.1)',   border: 'rgba(201,148,58,0.25)',   icon: '📋' },
  'Thesis':            { color: '#a78bfa',  bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.25)',  icon: '🎓' },
  'Review Article':    { color: '#60a5fa',  bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)',   icon: '📖' },
  'Original Study':    { color: '#34d399',  bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)',   icon: '🔬' },
  'Meta-Analysis':     { color: '#fbbf24',  bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)',   icon: '📊' },
  'Case Series':       { color: '#fb923c',  bg: 'rgba(249,115,22,0.1)',   border: 'rgba(249,115,22,0.25)',   icon: '📂' },
  'Systematic Review': { color: '#34d399',  bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)',   icon: '🗂' },
  'Audit':             { color: '#e879f9',  bg: 'rgba(232,121,249,0.1)',  border: 'rgba(232,121,249,0.25)',  icon: '✅' },
  'Letter to Editor':  { color: '#f0e8d0',  bg: 'rgba(240,232,208,0.07)', border: 'rgba(240,232,208,0.15)', icon: '✉️' },
}
const DEFAULT_META = { color: 'rgba(240,232,208,0.5)', bg: 'rgba(255,255,255,0.07)', border: 'rgba(255,255,255,0.12)', icon: '📄' }

const NAV = [
  { label: 'Overview',    icon: '◈', href: '/dashboard' },
  { label: 'All Projects', icon: '⬡', href: '/projects' },
  { label: 'New Project', icon: '+', href: '/new-project' },
  { label: 'Tools',       icon: '🔧', href: '/tools' },
  { label: 'Settings',    icon: '⚙', href: '/settings' },
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading]   = useState(true)
  const [email, setEmail]       = useState('')
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('All')
  const [upgrading, setUpgrading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const router = useRouter()
  const { isScholar, projectLimit } = useSubscription()

  const handleUpgrade = async () => {
    setUpgrading(true)
    setPaymentError(null)
    await openRazorpayCheckout(undefined, (msg) => setPaymentError(msg))
    setUpgrading(false)
  }

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 5000)
    fetchProjects().finally(() => clearTimeout(t))
  }, [])

  const fetchProjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.push('/login'); return }
      setEmail(user.email || '')
      const { data, error } = await supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      if (!error && data) setProjects(data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const signOut = async () => { await supabase.auth.signOut(); router.push('/') }
  const initials = email ? email[0].toUpperCase() : '?'

  const studyTypes = ['All', ...Array.from(new Set(projects.map(p => p.study_type).filter(Boolean)))]
  const filtered = projects.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || p.study_type === filter
    return matchSearch && matchFilter
  })

  const tiltCard = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width  - 0.5
    const y = (e.clientY - r.top)  / r.height - 0.5
    e.currentTarget.style.transform = `perspective(700px) rotateY(${x*10}deg) rotateX(${-y*7}deg) translateY(-4px)`
    e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.5), 0 0 20px rgba(201,148,58,0.08)'
  }
  const resetCard = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = ''
    e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <div className="workspace-layout" style={{ background: '#080c18', fontFamily: "var(--font-inter), 'DM Sans', system-ui, sans-serif", color: '#f0e8d0' }}>

      {/* SIDEBAR */}
      <aside className="workspace-sidebar">
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(201,148,58,0.6), transparent)' }}/>

        <div style={{ padding: '0 24px 32px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.webp" alt="R" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(201,148,58,0.2)' }}/>
            <span style={{ fontSize: 17, fontWeight: 700, fontFamily: "var(--font-cinzel), 'Cormorant Garamond', serif", letterSpacing: '0.02em' }}>
              <span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span>
            </span>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => {
            const active = item.href === '/projects'
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                  background: active ? 'rgba(201,148,58,0.12)' : 'transparent',
                  color: active ? '#c9943a' : 'rgba(240,232,208,0.5)',
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  border: active ? '1px solid rgba(201,148,58,0.25)' : '1px solid transparent',
                  transition: 'all 0.18s',
                }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color='rgba(240,232,208,0.8)' } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='rgba(240,232,208,0.5)' } }}
                >
                  <span style={{ fontSize: 15, color: active ? '#c9943a' : 'inherit', opacity: active ? 1 : 0.6 }}>{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="workspace-sidebar-bottom" style={{ padding: '20px 16px 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #c9943a, #8b6914)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#080c18', flexShrink: 0, boxShadow: '0 0 10px rgba(201,148,58,0.25)' }}>{initials}</div>
            <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
          </div>
          <button onClick={signOut}
            style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: 'rgba(240,232,208,0.35)', fontSize: 12, cursor: 'pointer', transition: 'all 0.18s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(248,113,113,0.25)'; (e.currentTarget as HTMLElement).style.color='rgba(248,113,113,0.7)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color='rgba(240,232,208,0.35)' }}
          >Sign out</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="workspace-content" style={{ overflowY: 'auto', position: 'relative' }}>
        <div style={{ position: 'fixed', top: '15%', right: '8%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,148,58,0.04) 0%, transparent 70%)', pointerEvents: 'none' }}/>

        {/* Upgrade banner for free users near limit */}
        {!isScholar && projects.length >= 2 && (
          <div style={{ marginBottom: 20, padding: '14px 20px', borderRadius: 14, background: 'rgba(201,148,58,0.07)', border: '1px solid rgba(201,148,58,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', animation: 'fadeInUp 0.4s both' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#c9943a', margin: '0 0 2px' }}>
                {projects.length >= 3 ? '🔒 Project limit reached' : `⚡ ${3 - projects.length} free project slot left`}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.45)', margin: 0 }}>
                Try Scholar free for 7 days — then ₹499/mo. Cancel anytime.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <button onClick={handleUpgrade} disabled={upgrading} style={{ padding: '9px 20px', borderRadius: 10, background: 'linear-gradient(135deg, #c9943a, #e8b84a)', color: '#080c18', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {upgrading ? '…' : '✦ Start 7-day Free Trial — ₹499/mo after'}
              </button>
              {paymentError && <span style={{ fontSize: 11, color: '#f87171' }}>{paymentError}</span>}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="stats-row" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, animation: 'fadeInUp 0.4s both' }}>
          <div>
            <h1 style={{ fontSize: 34, fontWeight: 600, color: '#f0e8d0', letterSpacing: '0.01em', margin: 0, fontFamily: "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif", lineHeight: 1.1 }}>
              Research Workspaces
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.35)', margin: '6px 0 0' }}>
              {projects.length} project{projects.length !== 1 ? 's' : ''} total
              {!isScholar && <span style={{ color: 'rgba(201,148,58,0.5)', marginLeft: 8 }}>· {projects.length}/3 free</span>}
            </p>
          </div>
          {!isScholar && projects.length >= 3 ? (
            <button onClick={handleUpgrade} disabled={upgrading} style={{ fontSize: 13, fontWeight: 700, color: '#080c18', padding: '11px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #c9943a, #e8b84a)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {upgrading ? '…' : '🔒 Start Free Trial'}
            </button>
          ) : (
            <Link href="/new-project" style={{
              textDecoration: 'none', fontSize: 13, fontWeight: 700, color: '#080c18',
              padding: '11px 24px', borderRadius: 10,
              background: 'linear-gradient(135deg, #c9943a, #e8b84a)',
              boxShadow: '0 4px 20px rgba(201,148,58,0.3)', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 8px 30px rgba(201,148,58,0.45)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow='0 4px 20px rgba(201,148,58,0.3)' }}
            >+ New Project</Link>
          )}
        </div>

        {/* Search + Filter bar */}
        {projects.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, animation: 'fadeInUp 0.4s 0.1s both' }}>
            {/* search */}
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'rgba(240,232,208,0.3)', pointerEvents: 'none' }}>🔍</span>
              <input
                type="text" placeholder="Search projects…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px 10px 40px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, fontSize: 13, color: '#f0e8d0',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>
            {/* type filter pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {studyTypes.map(t => {
                const active = filter === t
                const meta = STUDY_META[t]
                return (
                  <button key={t} type="button" onClick={() => setFilter(t)} style={{
                    padding: '8px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: active ? `1px solid ${meta?.border || 'rgba(201,148,58,0.4)'}` : '1px solid rgba(255,255,255,0.08)',
                    background: active ? (meta?.bg || 'rgba(201,148,58,0.12)') : 'rgba(255,255,255,0.03)',
                    color: active ? (meta?.color || '#c9943a') : 'rgba(240,232,208,0.45)',
                    transition: 'all 0.18s', outline: 'none', fontFamily: 'inherit',
                  }}>{t}</button>
                )
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 120, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', animation: `pulse 1.5s ${i*0.15}s ease-in-out infinite` }}/>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(201,148,58,0.15)', borderRadius: 20, padding: '60px 40px', textAlign: 'center', animation: 'fadeInUp 0.4s both' }}>
            <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.2 }}>⬡</div>
            <p style={{ color: 'rgba(240,232,208,0.35)', fontSize: 14, marginBottom: 20 }}>
              {search || filter !== 'All' ? 'No projects match your search.' : 'No projects yet. Start your first research workspace.'}
            </p>
            {!search && filter === 'All' && (
              <Link href="/new-project" style={{ textDecoration: 'none', display: 'inline-block', background: 'linear-gradient(135deg, #c9943a, #e8b84a)', color: '#080c18', fontWeight: 700, fontSize: 13, padding: '11px 26px', borderRadius: 10 }}>Create First Project</Link>
            )}
          </div>
        ) : (
          <div className="grid-auto" style={{ gap: 14 }}>
            {filtered.map((project, idx) => {
              const meta = STUDY_META[project.study_type] || DEFAULT_META
              return (
                <Link key={project.id} href={`/workspace/${project.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div
                    onMouseMove={tiltCard} onMouseLeave={resetCard}
                    style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16, padding: '22px',
                      cursor: 'pointer', transition: 'transform 0.15s ease, border-color 0.2s, box-shadow 0.2s',
                      position: 'relative', overflow: 'hidden',
                      animation: `fadeInUp 0.4s ${idx * 0.05}s both`,
                    }}>
                    {/* top tint */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${meta.color}55, transparent)` }}/>

                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                        {meta.icon}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                        {project.study_type || 'Research'}
                      </span>
                    </div>

                    <h2 style={{ fontSize: 15, fontWeight: 600, color: '#f0e8d0', margin: '0 0 6px', lineHeight: 1.4 }}>{project.title.charAt(0).toUpperCase() + project.title.slice(1)}</h2>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)' }}>
                        {new Date(project.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: meta.color }}>Open →</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
      `}</style>
    </div>
  )
}
