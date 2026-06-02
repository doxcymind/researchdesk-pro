'use client'

import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LiveClock from '@/lib/components/dashboard/LiveClock'
const PubMedFeed = lazy(() => import('@/lib/components/dashboard/PubMedFeed'))
import WorkflowGuide from '@/lib/components/dashboard/WorkflowGuide'
import DynamicDashboard from '@/lib/components/dashboard/DynamicDashboard'
import { useSessionGuard } from '@/lib/hooks/useSessionGuard'

const NAV = [
  { label: 'Dashboard',   icon: '◈', href: '/dashboard' },
  { label: 'All Projects', icon: '⬡', href: '/projects' },
  { label: 'New Project', icon: '+', href: '/new-project' },
  { label: 'Tools',       icon: '🔧', href: '/tools' },
  { label: 'Settings',    icon: '⚙', href: '/settings' },
]


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
  useSessionGuard()
  const [email, setEmail]       = useState('')
  const [displayName, setDisplayName] = useState('')
  const [projects, setProjects] = useState<any[]>([])
  const [sectionsCount, setSectionsCount] = useState(0)
  const [loaded, setLoaded]     = useState(false)
  const [showWorkflow, setShowWorkflow] = useState(false)
  const router = useRouter()

  /* counter trigger once data loads */
  const cnt     = useCounter(projects.length, 800, loaded)
  const cntSec  = useCounter(sectionsCount, 900, loaded)

  useEffect(() => {
    const timeout = setTimeout(() => setLoaded(true), 6000)
    loadAll().finally(() => clearTimeout(timeout))
  }, [])

  const loadAll = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.push('/login'); return }

      // Set user info immediately
      setEmail(user.email || '')
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || ''
      const firstName = fullName ? fullName.split(' ')[0] : (user.email?.split('@')[0] || '')
      setDisplayName(firstName)

      // Fire all DB queries in parallel
      const [projectsRes, secCountRes] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('project_sections').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      setProjects(projectsRes.data || [])
      setSectionsCount(secCountRes.count || 0)
      if (!localStorage.getItem('rd_workflow_seen')) setShowWorkflow(true)
    } catch (err) {
      console.error('loadAll error:', err)
    } finally {
      setLoaded(true)
    }
  }

  const signOut = async () => {
    localStorage.removeItem('rd_browser_open')
    await supabase.auth.signOut()
    router.push('/')
  }

  const initials = displayName ? displayName[0].toUpperCase() : (email ? email[0].toUpperCase() : '?')

  /* greeting by time */
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'


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
      <main className="workspace-content" style={{ overflowY: 'auto', position: 'relative', background: '#080c18' }}>

        {/* ── Cinematic aurora background ── */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10%', left: '30%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,148,58,0.07) 0%, transparent 65%)', animation: 'auroraFloat 12s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '40%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 65%)', animation: 'auroraFloat 16s ease-in-out infinite reverse' }} />
          <div style={{ position: 'absolute', bottom: '10%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.04) 0%, transparent 65%)', animation: 'auroraFloat 20s ease-in-out infinite' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>

        {/* skeleton */}
        {!loaded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div className="skel" style={{ height: 120, borderRadius: 24 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[1,2,3,4].map(i => <div key={i} className="skel" style={{ height: 140, borderRadius: 18 }} />)}
            </div>
          </div>
        )}

        {loaded && <>

          {/* ── CINEMATIC HERO ── */}
          <div style={{ position: 'relative', marginBottom: 28, padding: 2, borderRadius: 26 }}>
            {/* rotating conic border */}
            <div className="hero-ring" style={{ position: 'absolute', inset: 0, borderRadius: 26, zIndex: 0 }} />
          <div style={{
            position: 'relative', zIndex: 1, padding: '32px 36px',
            borderRadius: 24, overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(201,148,58,0.08) 0%, rgba(5,8,15,0.95) 50%, rgba(167,139,250,0.05) 100%)',
          }}>
            {/* animated shimmer line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #c9943a, rgba(167,139,250,0.8), transparent)', animation: 'shimmerLine 4s ease-in-out infinite' }} />

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="spin-symbol" style={{ fontSize: 20, color: 'rgba(201,148,58,0.5)' }}>◎</span>
                  <h1 style={{ fontSize: 38, fontWeight: 600, color: '#f0e8d0', margin: 0, fontFamily: "var(--font-cinzel),'Cormorant Garamond',Georgia,serif", lineHeight: 1.1 }}>
                    {greeting}{displayName ? ', ' : ''}<span style={{ color: '#c9943a' }}>{displayName}</span>
                  </h1>
                </div>
              </div>
              <Link href="/new-project" style={{
                textDecoration: 'none', fontSize: 13, fontWeight: 700,
                color: '#080c18', padding: '12px 26px', borderRadius: 12,
                background: 'linear-gradient(135deg, #c9943a, #e8b84a)',
                boxShadow: '0 4px 28px rgba(201,148,58,0.35)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8,
                alignSelf: 'flex-start', outline: '2px solid transparent',
                animation: 'shimmerOutline 2.5s ease-in-out infinite',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px) scale(1.02)'; (e.currentTarget as HTMLElement).style.boxShadow='0 8px 36px rgba(201,148,58,0.5)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow='0 4px 28px rgba(201,148,58,0.35)' }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Project
              </Link>
            </div>

            {/* stat pills */}
            <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap', alignItems: 'center' }}>
              <LiveClock />
              {[
                { label: 'Active Projects', value: cnt, color: '#c9943a' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: "var(--font-inter), sans-serif" }}>{s.value}</span>
                  <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          </div>{/* end hero-ring wrapper */}

          {/* ── WORKFLOW GUIDE — first login only ── */}
          {showWorkflow && (
            <div style={{ position: 'relative', marginBottom: 28 }}>
              <WorkflowGuide />
              <button onClick={() => { setShowWorkflow(false); localStorage.setItem('rd_workflow_seen', '1') }}
                style={{ position: 'absolute', top: 12, right: 14, background: 'transparent', border: 'none', color: 'rgba(240,232,208,0.3)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>×</button>
            </div>
          )}

          {/* ── DYNAMIC: Streak + Recent + Progress ── */}
          <DynamicDashboard projects={projects} />

          {/* PubMed Feed — lazy loaded so it never blocks dashboard render */}
          <Suspense fallback={null}>
            <PubMedFeed />
          </Suspense>
        </>}
        </div>
      </main>


      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes skelPulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes auroraFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(30px, -20px) scale(1.08); }
          66%       { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes shimmerLine {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes breatheOrb {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.18); opacity: 0.6; }
        }
        @keyframes shimmerOutline {
          0%, 100% { box-shadow: 0 4px 28px rgba(201,148,58,0.35), 0 0 0 2px rgba(232,184,74,0.6); }
          50%       { box-shadow: 0 4px 28px rgba(201,148,58,0.35), 0 0 0 3px rgba(232,184,74,0.15); }
        }
        @keyframes spinRing {
          from { --ring-angle: 0deg; }
          to   { --ring-angle: 360deg; }
        }
        @property --ring-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .hero-ring {
          background: conic-gradient(
            from var(--ring-angle),
            rgba(201,148,58,0.15) 0%,
            rgba(201,148,58,0.6) 15%,
            rgba(232,184,74,0.9) 20%,
            rgba(201,148,58,0.6) 25%,
            rgba(201,148,58,0.15) 40%,
            rgba(201,148,58,0.08) 100%
          );
          animation: spinRing 5s linear infinite;
        }
        .skel {
          background: rgba(255,255,255,0.07);
          animation: skelPulse 1.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
