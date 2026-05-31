'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

/* ── animated counter hook ───────────────────────────────── */
function useCounter(target: number, duration = 1600, start = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!start) return
    let raf: number
    const startTime = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(ease * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [start, target, duration])
  return val
}

/* ── scroll-reveal hook ──────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

export default function HomePage() {
  const cinzel   = "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif"
  const playfair = "var(--font-playfair), 'Playfair Display', Georgia, serif"
  const inter    = "var(--font-inter), 'DM Sans', system-ui, sans-serif"

  /* mouse parallax */
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 })
  const heroRef = useRef<HTMLDivElement>(null)
  const onMouseMove = (e: React.MouseEvent) => {
    const r = heroRef.current?.getBoundingClientRect()
    if (!r) return
    setMouse({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height })
  }

  /* typewriter for headline suffix */
  const words = ['Science', 'Discovery', 'Publication', 'Research']
  const [wordIdx, setWordIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    const target = words[wordIdx]
    let timeout: NodeJS.Timeout
    if (!deleting && displayed.length < target.length) {
      timeout = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 80)
    } else if (!deleting && displayed.length === target.length) {
      timeout = setTimeout(() => setDeleting(true), 2200)
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 45)
    } else if (deleting && displayed.length === 0) {
      setDeleting(false)
      setWordIdx((wordIdx + 1) % words.length)
    }
    return () => clearTimeout(timeout)
  })

  /* stat counters */
  const statsRef = useRef<HTMLDivElement>(null)
  const [statsVisible, setStatsVisible] = useState(false)
  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsVisible(true); obs.disconnect() } }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  const c1 = useCounter(500, 1400, statsVisible)
  const c2 = useCounter(12000, 1800, statsVisible)
  const c3 = useCounter(98, 1200, statsVisible)

  /* 3-D card tilt */
  const tiltCard = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width  - 0.5
    const y = (e.clientY - r.top)  / r.height - 0.5
    e.currentTarget.style.transform = `perspective(600px) rotateY(${x*14}deg) rotateX(${-y*10}deg) translateY(-4px) scale(1.03)`
    e.currentTarget.style.boxShadow = `0 20px 50px rgba(0,0,0,0.6), 0 0 30px ${(e.currentTarget.dataset.glow as string)}`
  }
  const resetCard = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = ''
    e.currentTarget.style.boxShadow = `0 0 30px ${(e.currentTarget.dataset.glow as string)}`
  }

  /* scroll-reveal sections */
  const featuresReveal  = useReveal()
  const workflowReveal  = useReveal()
  const studyReveal     = useReveal()
  const ctaReveal       = useReveal()

  /* parallax values */
  const px = (mouse.x - 0.5) * 2
  const py = (mouse.y - 0.5) * 2

  return (
    <main style={{ minHeight: '100vh', color: '#f0e8d0', overflowX: 'hidden', fontFamily: inter, background: '#080c18' }}>

      {/* ── GLOBAL FLOATING ICONS ── */}
      <div className="floating-icons">
        {[
          { icon: '📚', x: '4%',  y: '8%',  size: 26, delay: '0s',   dur: '7s'  },
          { icon: '🔬', x: '9%',  y: '18%', size: 22, delay: '1.5s', dur: '8s'  },
          { icon: '📖', x: '2%',  y: '32%', size: 20, delay: '3s',   dur: '6s'  },
          { icon: '🧬', x: '7%',  y: '46%', size: 18, delay: '0.8s', dur: '9s'  },
          { icon: '🎓', x: '3%',  y: '62%', size: 24, delay: '2s',   dur: '7.5s'},
          { icon: '📝', x: '8%',  y: '75%', size: 20, delay: '4s',   dur: '6.5s'},
          { icon: '🏛',  x: '5%',  y: '88%', size: 22, delay: '1s',   dur: '8.5s'},
          { icon: '📜', x: '88%', y: '6%',  size: 24, delay: '0.5s', dur: '8s'  },
          { icon: '🔭', x: '93%', y: '17%', size: 20, delay: '2.5s', dur: '7s'  },
          { icon: '📊', x: '86%', y: '29%', size: 22, delay: '1.2s', dur: '9s'  },
          { icon: '✏️', x: '91%', y: '42%', size: 18, delay: '3.5s', dur: '6s'  },
          { icon: '📋', x: '87%', y: '56%', size: 20, delay: '0.3s', dur: '7.5s'},
          { icon: '🧪', x: '94%', y: '68%', size: 22, delay: '2.2s', dur: '8s'  },
          { icon: '📌', x: '89%', y: '80%', size: 18, delay: '1.8s', dur: '6.5s'},
          { icon: '🏥', x: '92%', y: '91%', size: 22, delay: '0.7s', dur: '7s'  },
          { icon: '🧠', x: '35%', y: '4%',  size: 20, delay: '1.6s', dur: '7s'  },
          { icon: '💊', x: '70%', y: '5%',  size: 18, delay: '0.4s', dur: '6.5s'},
        ].map((f, i) => (
          <div key={i} style={{
            position: 'absolute', left: f.x, top: f.y, fontSize: f.size,
            opacity: 0.12, filter: 'grayscale(0.2)',
            animation: `floatIcon ${f.dur} ${f.delay} ease-in-out infinite`,
          }}>{f.icon}</div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════ */}
      <div ref={heroRef} onMouseMove={onMouseMove}
        style={{ position: 'relative', minHeight: '100vh', background: '#05080f', overflow: 'hidden' }}>

        {/* Parallax aurora orbs */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div className="orb-1" style={{
            position: 'absolute', top: '-15%', left: '-5%', width: 900, height: 900, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(20,30,80,0.85) 0%, rgba(12,20,55,0.5) 40%, transparent 70%)',
            transform: `translate(${px * -18}px, ${py * -14}px)`, transition: 'transform 0.12s ease-out',
          }}/>
          <div className="orb-2" style={{
            position: 'absolute', top: '10%', right: '-10%', width: 750, height: 750, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(120,75,8,0.5) 0%, rgba(70,40,4,0.25) 45%, transparent 70%)',
            transform: `translate(${px * 22}px, ${py * 16}px)`, transition: 'transform 0.18s ease-out',
          }}/>
          <div className="orb-3" style={{
            position: 'absolute', bottom: '-15%', left: '25%', width: 650, height: 650, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(15,25,65,0.75) 0%, rgba(8,14,38,0.35) 50%, transparent 70%)',
            transform: `translate(${px * 12}px, ${py * -20}px)`, transition: 'transform 0.15s ease-out',
          }}/>
        </div>

        {/* Grid drift */}
        <div className="grid-drift" style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.035, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(201,148,58,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,148,58,1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          transform: `translate(${px * 8}px, ${py * 8}px)`, transition: 'transform 0.3s ease-out',
        }}/>

        {/* Noise grain */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.35, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")` }}/>

        {/* Constellation */}
        <svg style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none',
          transform: `translate(${px * 28}px, ${py * 18}px)`, transition: 'transform 0.25s ease-out',
        }}>
          <defs>
            <radialGradient id="sg" cx="70%" cy="35%" r="30%">
              <stop offset="0%" stopColor="#c9943a" stopOpacity="1"/>
              <stop offset="100%" stopColor="#c9943a" stopOpacity="0"/>
            </radialGradient>
          </defs>
          {([[820,55],[875,108],[928,76],[958,148],[898,188],[848,168],[808,238],[868,278],[938,248],[978,198],[1018,268],[958,318],[888,348],[828,308],[760,388],[820,440],[878,420]] as number[][]).map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r={i%3===0?2.4:1.6} fill="url(#sg)"
              style={{ animation: `twinkle ${2+i*0.4}s ${i*0.3}s ease-in-out infinite` }}/>
          ))}
          {([[820,55,875,108],[875,108,928,76],[875,108,898,188],[928,76,958,148],[958,148,898,188],[898,188,848,168],[848,168,808,238],[808,238,868,278],[868,278,938,248],[938,248,978,198],[978,198,958,148],[868,278,888,348],[888,348,958,318],[958,318,1018,268],[1018,268,938,248],[888,348,828,308]] as number[][]).map(([x1,y1,x2,y2],i)=>(
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#sg)" strokeWidth="0.6" opacity="0.4"/>
          ))}
        </svg>

        {/* Logo bg */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          backgroundImage: 'url(/logo.webp)',
          backgroundSize: '80%', backgroundRepeat: 'no-repeat', backgroundPosition: '-5% center',
          opacity: 0.28, filter: 'saturate(0.8) sepia(0.4) brightness(0.7)',
          maskImage: 'radial-gradient(ellipse 80% 85% at 28% 50%, black 0%, black 30%, rgba(0,0,0,0.6) 55%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 85% at 28% 50%, black 0%, black 30%, rgba(0,0,0,0.6) 55%, transparent 80%)',
          transform: `translate(${px * -10}px, ${py * -8}px)`, transition: 'transform 0.35s ease-out',
        }}/>

        {/* Vignettes */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
          background: 'linear-gradient(to right, rgba(8,12,24,0.82) 0%, rgba(8,12,24,0.5) 30%, rgba(8,12,24,0.1) 55%, transparent 70%)' }}/>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%', zIndex: 3, pointerEvents: 'none',
          background: 'linear-gradient(to top, #080c18 0%, transparent 100%)' }}/>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '10%', zIndex: 3, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(8,12,24,0.6) 0%, transparent 100%)' }}/>

        {/* ── NAVBAR ── */}
        <nav style={{ position: 'relative', zIndex: 20, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '18px 56px',
          borderTop: '2px solid rgba(201,148,58,0.55)',
          borderBottom: '1px solid rgba(201,148,58,0.15)',
          background: 'rgba(5,8,15,0.7)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 1px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,148,58,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <img src="/logo.webp" alt="ResearchDesk" style={{
              width: 38, height: 38, borderRadius: 9, objectFit: 'cover',
              border: '1px solid rgba(201,148,58,0.3)', boxShadow: '0 0 16px rgba(201,148,58,0.2)',
            }}/>
            <span style={{ fontFamily: cinzel, fontSize: 22, fontWeight: 700, letterSpacing: '0.04em' }}>
              <span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span>
            </span>
          </div>
          <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            {[
              { label: 'Features',        href: '/features' },
              { label: 'For Researchers', href: '/researchers' },
            ].map(item => (
              <a key={item.label} href={item.href} className="nav-link" style={{ fontFamily: inter, color: 'rgba(200,175,120,0.55)',
                fontSize: 13, cursor: 'pointer', letterSpacing: '0.02em', textDecoration: 'none' }}>{item.label}</a>
            ))}
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #e0b545 0%, #a06808 100%)',
              color: '#0a0600', padding: '9px 22px', borderRadius: 8,
              fontSize: 12, fontWeight: 800, textDecoration: 'none', fontFamily: inter,
              boxShadow: '0 4px 20px rgba(180,120,8,0.4)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              letterSpacing: '0.01em',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(180,120,8,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 20px rgba(180,120,8,0.4)'; }}>
              Get Started
            </Link>
          </div>
        </nav>

        {/* ── HERO BODY ── */}
        <section className="hero-section" style={{ position: 'relative', zIndex: 10 }}>
          <div className="hero-left">

            <div className="fade-up-1 badge-glow" style={{ display: 'inline-flex', alignItems: 'center', gap: 10,
              marginBottom: 34, padding: '8px 22px', borderRadius: 40,
              border: '1px solid rgba(201,148,58,0.4)',
              background: 'linear-gradient(90deg, rgba(201,148,58,0.1) 0%, rgba(201,148,58,0.04) 100%)',
              color: '#d4a84b', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.2em',
              textTransform: 'uppercase', fontFamily: cinzel, backdropFilter: 'blur(12px)',
              boxShadow: 'inset 0 1px 0 rgba(255,220,100,0.1)' }}>
              <span style={{ fontSize: 13 }}>✦</span>
              Built for the Next Generation of Research
              <span style={{ fontSize: 13 }}>✦</span>
            </div>

            <h1 className="fade-up-2" style={{ fontFamily: cinzel, fontWeight: 700, lineHeight: 1.08,
              marginBottom: 0, fontSize: 'clamp(3.2rem,5vw,5rem)', letterSpacing: '0.015em',
              color: '#f5eedd', textShadow: '0 2px 40px rgba(201,148,58,0.15)' }}>
              <span className="headline-word">The</span>{' '}
              <span className="headline-word">Operating</span><br/>
              <span className="headline-word">System</span>{' '}for{' '}
              <span className="text-fluid">Medical</span>
              <br/>
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <span className="text-fluid">{displayed}</span>
                <span style={{
                  display: 'inline-block', width: 3, height: '0.85em',
                  background: '#c9943a', marginLeft: 4, verticalAlign: 'middle',
                  animation: 'cursorBlink 1s step-end infinite',
                  borderRadius: 1,
                }}/>
              </span>
            </h1>

            <div className="fade-up-3" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '26px 0' }}>
              <div style={{ height: 1, width: 20, background: 'rgba(201,148,58,0.4)' }}/>
              <div style={{ height: 1, width: 40, background: 'rgba(201,148,58,0.7)' }}/>
              <svg width="14" height="14" viewBox="0 0 10 10" fill="#c9943a">
                <path d="M5 0L6.2 3.8L10 5L6.2 6.2L5 10L3.8 6.2L0 5L3.8 3.8Z"/>
              </svg>
              <div style={{ height: 1, width: 40, background: 'rgba(201,148,58,0.7)' }}/>
              <div style={{ height: 1, flex: 1, maxWidth: 160, background: 'linear-gradient(to right, rgba(201,148,58,0.4), transparent)' }}/>
            </div>

            <p className="fade-up-3" style={{ fontFamily: playfair, fontStyle: 'italic',
              fontSize: '1.08rem', color: 'rgba(180,150,100,0.8)', marginBottom: 14, lineHeight: 1.65 }}>
              From Idea → Manuscript → Publication
            </p>
            <p className="fade-up-3" style={{ color: 'rgba(115,90,58,0.9)', fontSize: '0.87rem',
              lineHeight: 2.0, marginBottom: 38, maxWidth: 400 }}>
              Stop juggling Word, Zotero, ChatGPT, PubMed and Excel.<br/>
              Build, review and publish research inside one intelligent workspace.
            </p>

            <div className="fade-up-4">
              <Link href="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: 11,
                background: 'linear-gradient(135deg, #e0b545 0%, #a06808 100%)',
                color: '#0a0600', padding: '15px 34px', borderRadius: 12,
                fontSize: 14, fontWeight: 800, textDecoration: 'none', fontFamily: inter,
                boxShadow: '0 8px 40px rgba(180,120,8,0.5), 0 0 0 1px rgba(224,181,69,0.3)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                letterSpacing: '0.01em',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow='0 16px 50px rgba(180,120,8,0.7), 0 0 0 1px rgba(224,181,69,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 8px 40px rgba(180,120,8,0.5), 0 0 0 1px rgba(224,181,69,0.3)'; }}>
                Get Started Free →
              </Link>
            </div>

            <div ref={statsRef} className="fade-up-5" style={{ display: 'flex', alignItems: 'center', gap: 0,
              marginTop: 44, paddingTop: 28, borderTop: '1px solid rgba(201,148,58,0.1)' }}>
              {[
                { val: statsVisible ? `${c1}+` : '0+',    label: 'Researchers' },
                { val: statsVisible ? `${(c2/1000).toFixed(0)}K+` : '0K+', label: 'Papers Written' },
                { val: statsVisible ? `${c3}%` : '0%',   label: 'Satisfaction' },
              ].map((s, i) => (
                <div key={s.label} style={{ flex: 1, paddingRight: i<2 ? 20 : 0,
                  borderRight: i<2 ? '1px solid rgba(201,148,58,0.1)' : 'none',
                  paddingLeft: i>0 ? 20 : 0 }}>
                  <div style={{ fontFamily: cinzel, fontSize: '1.2rem', fontWeight: 700,
                    color: '#c9943a', lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 10.5, color: 'rgba(120,95,58,0.7)', letterSpacing: '0.06em', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero right cards */}
          <div className="fade-up-2 hero-right" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              position: 'relative', borderRadius: 22, overflow: 'hidden',
              border: '1px solid rgba(201,148,58,0.22)',
              background: 'linear-gradient(160deg, rgba(12,16,32,0.9) 0%, rgba(5,8,15,0.95) 100%)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,148,58,0.08)',
              padding: '28px 28px 24px',
              transform: `perspective(1000px) rotateY(${px * -3}deg) rotateX(${py * 2}deg)`,
              transition: 'transform 0.2s ease-out',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #8b6914 15%, #c9943a 35%, #f0d060 50%, #c9943a 65%, #8b6914 85%, transparent)' }}/>
              <p style={{ textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: 'rgba(201,148,58,0.45)', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 26, fontFamily: cinzel }}>
                ✦ &nbsp; Research Journey &nbsp; ✦
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0 }}>
                {[
                  { emoji: '💡', label: 'Idea',        sub: 'Define your research', delay: '0s' },
                  { emoji: '✍️',  label: 'Manuscript',  sub: 'Write & AI-review',    delay: '1s' },
                  { emoji: '🏆', label: 'Publication', sub: 'Submit & publish',     delay: '2s' },
                ].map((node, ni) => (
                  <React.Fragment key={node.label}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flex: '0 0 auto', width: 110 }}>
                      <div style={{ position: 'relative', width: 72, height: 72 }}>
                        <div style={{
                          position: 'absolute', inset: -10, borderRadius: '50%',
                          border: '1px solid rgba(201,148,58,0.3)',
                          animation: `nodeRing 3s ${node.delay} ease-out infinite`,
                        }}/>
                        <div style={{
                          width: 72, height: 72, borderRadius: '50%',
                          background: 'radial-gradient(circle, rgba(201,148,58,0.14) 0%, rgba(201,148,58,0.04) 100%)',
                          border: '2px solid rgba(201,148,58,0.5)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 28, animation: `nodeActivate 3s ${node.delay} ease-in-out infinite`,
                        }}>{node.emoji}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#f0e8d0', fontFamily: cinzel, letterSpacing: '0.03em' }}>{node.label}</div>
                        <div style={{ fontSize: 9.5, color: 'rgba(201,148,58,0.45)', marginTop: 3, lineHeight: 1.4 }}>{node.sub}</div>
                      </div>
                    </div>
                    {ni < 2 && (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingBottom: 34 }}>
                        <div style={{ width: '100%', height: 2, background: 'rgba(201,148,58,0.12)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                          <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'linear-gradient(90deg, transparent 0%, rgba(201,148,58,0.25) 20%, #c9943a 50%, rgba(201,148,58,0.25) 80%, transparent 100%)',
                            animation: `dotFlow 2s ${ni === 0 ? '0.4s' : '1.4s'} linear infinite`,
                          }}/>
                        </div>
                        <div style={{ position: 'absolute', right: -6, color: 'rgba(201,148,58,0.5)', fontSize: 10 }}>›</div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 22 }}>
                {['Literature Review','Study Design','Ethics / IRB','Write Sections','AI Reviewer','Fix Citations','Journal Match','Submit','Revise & Accept'].map((pill) => (
                  <div key={pill} style={{
                    padding: '6px 8px', borderRadius: 8, textAlign: 'center',
                    background: 'rgba(201,148,58,0.05)', border: '1px solid rgba(201,148,58,0.1)',
                    fontSize: 9.5, color: 'rgba(240,232,208,0.45)', fontWeight: 500,
                    transition: 'all 0.2s', cursor: 'default',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(201,148,58,0.12)'; (e.currentTarget as HTMLElement).style.color='rgba(240,232,208,0.8)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(201,148,58,0.05)'; (e.currentTarget as HTMLElement).style.color='rgba(240,232,208,0.45)'; }}
                  >{pill}</div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { icon: '✦', title: 'AI Reviewer',   desc: 'Instant section-by-section feedback', color: '#c9943a', glow: 'rgba(201,148,58,0.18)', delay: '0s' },
                { icon: '📎', title: 'Citations',     desc: 'Auto-generate bibliographies',         color: '#a78bfa', glow: 'rgba(167,139,250,0.15)', delay: '0.5s' },
                { icon: '🗂', title: 'Journal Match', desc: 'Find the best journal for your paper', color: '#60a5fa', glow: 'rgba(96,165,250,0.15)',  delay: '1s' },
              ].map(card => (
                <div key={card.title} data-glow={card.glow} onMouseMove={tiltCard} onMouseLeave={resetCard}
                  style={{
                    padding: '20px 14px 18px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16, textAlign: 'center',
                    animation: `cardFloat 4s ${card.delay} ease-in-out infinite`,
                    boxShadow: `0 0 30px ${card.glow}`,
                    position: 'relative', overflow: 'hidden',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    cursor: 'default',
                  }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${card.color}44, transparent)` }}/>
                  <div style={{ fontSize: 24, marginBottom: 9 }}>{card.icon}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: card.color, marginBottom: 5, fontFamily: cinzel, letterSpacing: '0.03em' }}>{card.title}</div>
                  <div style={{ fontSize: 9.5, color: 'rgba(240,232,208,0.35)', lineHeight: 1.55 }}>{card.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FEATURES GRID
      ══════════════════════════════════════════════════════════════ */}
      <div ref={featuresReveal.ref} style={{
        padding: '100px 56px',
        background: 'linear-gradient(180deg, #080c18 0%, #0a0e1c 100%)',
        opacity: featuresReveal.visible ? 1 : 0,
        transform: featuresReveal.visible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: cinzel, marginBottom: 14 }}>✦ &nbsp; Everything You Need &nbsp; ✦</p>
            <h2 style={{ fontFamily: cinzel, fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 600, color: '#f0e8d0', lineHeight: 1.15 }}>
              One platform. Every tool.<br/>
              <span className="text-fluid">Zero context-switching.</span>
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(240,232,208,0.35)', maxWidth: 520, margin: '20px auto 0', lineHeight: 1.8, fontFamily: playfair, fontStyle: 'italic' }}>
              ResearchDesk brings together every tool a medical researcher needs — from first draft to final submission.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { icon: '✦', color: '#c9943a', title: 'AI Draft Generation', desc: 'Write any section of your manuscript instantly. Just describe your study and let AI do the first pass.' },
              { icon: '🔬', color: '#34d399', title: 'AI Peer Review', desc: 'Get editor-level feedback on every section — structure, logic, language, and citation gaps.' },
              { icon: '💬', color: '#60a5fa', title: 'AI Research Assistant', desc: 'Chat with your manuscript. Ask for rewrites, explanations, or literature suggestions in real time.' },
              { icon: '📚', color: '#a78bfa', title: 'Citation Generator', desc: 'Auto-generate Vancouver, APA, AMA and 10+ citation styles from DOI, PubMed ID, or manual entry.' },
              { icon: '🗂', color: '#f59e0b', title: 'Journal Selector', desc: 'Find the best-fit journals for your paper based on study type, specialty, and impact factor.' },
              { icon: '📋', color: '#f43f5e', title: 'Rejection Tracker', desc: 'Track every submission, revision, and rejection in one place. Never lose track of your submission history.' },
              { icon: '🔍', color: '#22d3ee', title: 'DOI Resolver', desc: 'Instantly resolve any DOI to full citation details, authors with ORCID, and formatted references.' },
              { icon: '🔬', color: '#84cc16', title: 'Clinical Trials', desc: 'Search ClinicalTrials.gov directly within your workspace. Find related trials and reference them.' },
              { icon: '☑️', color: '#fb923c', title: 'Submission Checklist', desc: 'Know exactly what a journal requires before you submit. Automated checklists tailored per study type.' },
            ].map((f, i) => (
              <div key={f.title} className="feat-card" style={{
                padding: '28px 24px',
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 18,
                opacity: featuresReveal.visible ? 1 : 0,
                transform: featuresReveal.visible ? 'translateY(0)' : 'translateY(30px)',
                transition: `opacity 0.6s ${i * 0.07}s ease, transform 0.6s ${i * 0.07}s ease`,
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 13, marginBottom: 18,
                  background: `${f.color}18`, border: `1px solid ${f.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>{f.icon}</div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f0e8d0', marginBottom: 8, fontFamily: cinzel, letterSpacing: '0.02em' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.4)', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════ */}
      <div ref={workflowReveal.ref} style={{
        padding: '100px 56px',
        background: '#05080f',
        position: 'relative',
        overflow: 'hidden',
        opacity: workflowReveal.visible ? 1 : 0,
        transform: workflowReveal.visible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
      }}>
        {/* Subtle bg glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(201,148,58,0.04) 0%, transparent 70%)', pointerEvents: 'none' }}/>

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: cinzel, marginBottom: 14 }}>✦ &nbsp; How It Works &nbsp; ✦</p>
            <h2 style={{ fontFamily: cinzel, fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 600, color: '#f0e8d0', lineHeight: 1.15 }}>
              From blank page to<br/>
              <span className="text-fluid">published paper</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, position: 'relative' }}>
            {/* Connector line */}
            <div style={{ position: 'absolute', top: 36, left: '12.5%', right: '12.5%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,148,58,0.3) 20%, rgba(201,148,58,0.3) 80%, transparent)', zIndex: 0 }}/>

            {[
              { step: '01', icon: '💡', title: 'Create a Project', desc: 'Name your study, choose study type. ResearchDesk sets up the right sections automatically.' },
              { step: '02', icon: '✍️', title: 'Write with AI', desc: 'Use AI to generate drafts, get instant feedback, and improve every section of your manuscript.' },
              { step: '03', icon: '📚', title: 'Cite & Review', desc: 'Generate citations in any style. Run the AI peer reviewer to catch errors before submission.' },
              { step: '04', icon: '🚀', title: 'Submit & Track', desc: 'Match to the right journal, export your manuscript, and track every submission in one place.' },
            ].map((s, i) => (
              <div key={s.step} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                padding: '0 24px',
                opacity: workflowReveal.visible ? 1 : 0,
                transform: workflowReveal.visible ? 'translateY(0)' : 'translateY(30px)',
                transition: `opacity 0.6s ${i * 0.15}s ease, transform 0.6s ${i * 0.15}s ease`,
                position: 'relative', zIndex: 1,
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(201,148,58,0.15), rgba(201,148,58,0.04))',
                  border: '2px solid rgba(201,148,58,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, marginBottom: 20,
                  boxShadow: '0 0 30px rgba(201,148,58,0.1)',
                  animation: `nodeActivate 3s ${i * 0.8}s ease-in-out infinite`,
                }}>{s.icon}</div>
                <div style={{ fontSize: 10, color: 'rgba(201,148,58,0.4)', letterSpacing: '0.15em', marginBottom: 10, fontFamily: cinzel }}>{s.step}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f0e8d0', marginBottom: 12, fontFamily: cinzel }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.38)', lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          STUDY TYPES
      ══════════════════════════════════════════════════════════════ */}
      <div ref={studyReveal.ref} style={{
        padding: '80px 56px',
        background: 'linear-gradient(180deg, #0a0e1c 0%, #080c18 100%)',
        opacity: studyReveal.visible ? 1 : 0,
        transform: studyReveal.visible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: cinzel, marginBottom: 14 }}>✦ &nbsp; Study Types &nbsp; ✦</p>
            <h2 style={{ fontFamily: cinzel, fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 600, color: '#f0e8d0' }}>
              Built for every type of medical research
            </h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {['Case Report', 'RCT', 'Cohort Study', 'Systematic Review', 'Meta-Analysis', 'Cross-Sectional', 'Case-Control', 'Qualitative Research', 'Letter to Editor', 'Review Article', 'Audit', 'Thesis'].map((t, i) => (
              <div key={t} style={{
                padding: '10px 20px', borderRadius: 40,
                background: 'rgba(201,148,58,0.06)',
                border: '1px solid rgba(201,148,58,0.18)',
                fontSize: 13, color: 'rgba(240,232,208,0.6)',
                transition: 'all 0.25s', cursor: 'default',
                opacity: studyReveal.visible ? 1 : 0,
                transform: studyReveal.visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                transitionDelay: `${i * 0.04}s`,
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(201,148,58,0.14)'; (e.currentTarget as HTMLElement).style.color='#f0e8d0'; (e.currentTarget as HTMLElement).style.borderColor='rgba(201,148,58,0.4)'; (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(201,148,58,0.06)'; (e.currentTarget as HTMLElement).style.color='rgba(240,232,208,0.6)'; (e.currentTarget as HTMLElement).style.borderColor='rgba(201,148,58,0.18)'; (e.currentTarget as HTMLElement).style.transform='translateY(0)'; }}
              >{t}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════════════ */}
      <div ref={ctaReveal.ref} style={{
        padding: '100px 56px',
        background: '#05080f',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        opacity: ctaReveal.visible ? 1 : 0,
        transform: ctaReveal.visible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
      }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 500, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(201,148,58,0.07) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>✦</div>
          <h2 style={{ fontFamily: cinzel, fontSize: 'clamp(2.2rem, 4vw, 3.4rem)', fontWeight: 600, color: '#f0e8d0', lineHeight: 1.2, marginBottom: 20 }}>
            Ready to publish<br/>
            <span className="text-fluid">better research?</span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(240,232,208,0.4)', lineHeight: 1.8, marginBottom: 44, fontFamily: playfair, fontStyle: 'italic' }}>
            Join hundreds of researchers who write faster, cite smarter,<br/>and submit with confidence using ResearchDesk.
          </p>
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            background: 'linear-gradient(135deg, #e0b545 0%, #a06808 100%)',
            color: '#0a0600', padding: '18px 48px', borderRadius: 14,
            fontSize: 16, fontWeight: 800, textDecoration: 'none', fontFamily: inter,
            boxShadow: '0 10px 50px rgba(180,120,8,0.55)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px) scale(1.03)'; e.currentTarget.style.boxShadow='0 20px 60px rgba(180,120,8,0.75)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 10px 50px rgba(180,120,8,0.55)'; }}>
            Start for Free — No Credit Card Needed →
          </Link>
          <div style={{ marginTop: 24, fontSize: 12, color: 'rgba(201,148,58,0.35)', letterSpacing: '0.06em' }}>
            Free plan includes 3 projects · No payment required
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════ */}
      <footer style={{ borderTop: '1px solid rgba(180,130,20,0.12)', background: '#0c0906', padding: '26px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#4a3820', fontSize: 12 }}>
          <div style={{ fontFamily: cinzel, letterSpacing: '0.05em' }}>© 2026 ResearchDesk. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 30 }}>
            {[
              { label: 'Privacy Policy',   href: '/privacy' },
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Contact',          href: '/contact' },
            ].map(t => (
              <Link key={t.label} href={t.href} style={{ color: '#4a3820', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e=>(e.currentTarget.style.color='#c9943a')}
                onMouseLeave={e=>(e.currentTarget.style.color='#4a3820')}>{t.label}</Link>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes floatIcon {
          0%   { transform: translateY(0px) rotate(0deg); }
          25%  { transform: translateY(-10px) rotate(3deg); }
          50%  { transform: translateY(-18px) rotate(-2deg); }
          75%  { transform: translateY(-8px) rotate(4deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
      `}</style>
    </main>
  )
}
