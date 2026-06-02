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
  const words = ['Publication', 'Research', 'Case Report', 'Review Article', 'Meta-Analysis', 'Clinical Study']
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
  }, [displayed, deleting, wordIdx])

  /* stat counters — trigger when in view */
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

  /* parallax values */
  const px = (mouse.x - 0.5) * 2   // -1 … +1
  const py = (mouse.y - 0.5) * 2

  return (
    <main style={{ minHeight: '100vh', color: '#f0e8d0', overflowX: 'hidden', fontFamily: inter, background: '#080c18' }}>

      {/* ── GLOBAL FLOATING ICONS ── */}
      <div className="floating-icons">
        {[
          // top-left cluster
          { icon: '📚', x: '4%',  y: '8%',  size: 26, delay: '0s',   dur: '7s'  },
          { icon: '🔬', x: '9%',  y: '18%', size: 22, delay: '1.5s', dur: '8s'  },
          { icon: '📖', x: '2%',  y: '32%', size: 20, delay: '3s',   dur: '6s'  },
          { icon: '🧬', x: '7%',  y: '46%', size: 18, delay: '0.8s', dur: '9s'  },
          { icon: '🎓', x: '3%',  y: '62%', size: 24, delay: '2s',   dur: '7.5s'},
          { icon: '📝', x: '8%',  y: '75%', size: 20, delay: '4s',   dur: '6.5s'},
          { icon: '🏛',  x: '5%',  y: '88%', size: 22, delay: '1s',   dur: '8.5s'},
          // top-right cluster
          { icon: '📜', x: '88%', y: '6%',  size: 24, delay: '0.5s', dur: '8s'  },
          { icon: '🔭', x: '93%', y: '17%', size: 20, delay: '2.5s', dur: '7s'  },
          { icon: '📊', x: '86%', y: '29%', size: 22, delay: '1.2s', dur: '9s'  },
          { icon: '✏️', x: '91%', y: '42%', size: 18, delay: '3.5s', dur: '6s'  },
          { icon: '📋', x: '87%', y: '56%', size: 20, delay: '0.3s', dur: '7.5s'},
          { icon: '🧪', x: '94%', y: '68%', size: 22, delay: '2.2s', dur: '8s'  },
          { icon: '📌', x: '89%', y: '80%', size: 18, delay: '1.8s', dur: '6.5s'},
          { icon: '🏥', x: '92%', y: '91%', size: 22, delay: '0.7s', dur: '7s'  },
          // mid-left scattered
          { icon: '📑', x: '14%', y: '22%', size: 18, delay: '2.8s', dur: '9s'  },
          { icon: '💡', x: '16%', y: '55%', size: 20, delay: '1.1s', dur: '7s'  },
          { icon: '📓', x: '12%', y: '78%', size: 18, delay: '3.2s', dur: '6s'  },
          // mid-right scattered
          { icon: '🔍', x: '78%', y: '14%', size: 18, delay: '0.9s', dur: '8s'  },
          { icon: '📄', x: '80%', y: '44%', size: 18, delay: '2.6s', dur: '7s'  },
          { icon: '🩺', x: '76%', y: '72%', size: 20, delay: '1.4s', dur: '9s'  },
          // bottom mid scattered
          { icon: '✍️', x: '30%', y: '92%', size: 20, delay: '0.6s', dur: '7.5s'},
          { icon: '📗', x: '50%', y: '95%', size: 18, delay: '2s',   dur: '6s'  },
          { icon: '🔗', x: '68%', y: '93%', size: 18, delay: '3.8s', dur: '8s'  },
          // top-mid scattered
          { icon: '🧠', x: '35%', y: '4%',  size: 20, delay: '1.6s', dur: '7s'  },
          { icon: '📒', x: '55%', y: '3%',  size: 18, delay: '3s',   dur: '8.5s'},
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

        {/* LAYER 1 — Parallax aurora orbs */}
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
          <div style={{
            position: 'absolute', bottom: '0%', left: '-5%', width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(150,95,10,0.3) 0%, transparent 65%)', filter: 'blur(40px)',
            transform: `translate(${px * -10}px, ${py * 10}px)`, transition: 'transform 0.2s ease-out',
          }}/>
        </div>

        {/* LAYER 2 — Drifting grid */}
        <div className="grid-drift" style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.035, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(201,148,58,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,148,58,1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          transform: `translate(${px * 8}px, ${py * 8}px)`, transition: 'transform 0.3s ease-out',
        }}/>

        {/* LAYER 3 — Fine noise grain */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.35, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")` }}/>

        {/* LAYER 4 — Twinkling constellation (parallax) */}
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

        {/* LAYER 5 — R Logo: full background (parallax) */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          backgroundImage: 'url(/logo.webp)',
          backgroundSize: '80%', backgroundRepeat: 'no-repeat', backgroundPosition: '-5% center',
          opacity: 0.28, filter: 'saturate(0.8) sepia(0.4) brightness(0.7)',
          maskImage: 'radial-gradient(ellipse 80% 85% at 28% 50%, black 0%, black 30%, rgba(0,0,0,0.6) 55%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 85% at 28% 50%, black 0%, black 30%, rgba(0,0,0,0.6) 55%, transparent 80%)',
          transform: `translate(${px * -10}px, ${py * -8}px)`, transition: 'transform 0.35s ease-out',
        }}/>
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: `radial-gradient(ellipse 60% 70% at ${55 + px*5}% ${50 + py*5}%, rgba(201,148,58,0.1) 0%, transparent 70%)`,
          transition: 'background 0.2s ease-out',
        }}/>

        {/* LAYER 6 — Vignettes */}
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
              { label: 'Pricing',         href: '/pricing' },
            ].map(item => (
              <a key={item.label} href={item.href} className="nav-link" style={{ fontFamily: inter, color: 'rgba(200,175,120,0.55)',
                fontSize: 13, cursor: 'pointer', letterSpacing: '0.02em', textDecoration: 'none' }}>{item.label}</a>
            ))}
            <Link href="/login" style={{
              fontFamily: inter, fontSize: 13, color: 'rgba(200,175,120,0.55)',
              textDecoration: 'none', letterSpacing: '0.02em', transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(200,175,120,0.9)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(200,175,120,0.55)')}>
              Login
            </Link>
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center',
              background: 'linear-gradient(135deg, #e0b545 0%, #a06808 100%)',
              color: '#0a0600', padding: '9px 22px', borderRadius: 8,
              fontSize: 12, fontWeight: 800, textDecoration: 'none', fontFamily: inter,
              boxShadow: '0 4px 20px rgba(180,120,8,0.4)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              letterSpacing: '0.01em',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(180,120,8,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 20px rgba(180,120,8,0.4)'; }}>
              Sign Up Free
            </Link>
          </div>
        </nav>

        {/* ── HERO BODY ── */}
        <section className="hero-section" style={{ position: 'relative', zIndex: 10 }}>

          <div className="hero-left">

            {/* Eyebrow badge */}
            <div className="fade-up-1 badge-glow" style={{ display: 'inline-flex', alignItems: 'center', gap: 10,
              marginBottom: 34, padding: '9px 22px', borderRadius: 40,
              border: '1px solid rgba(201,148,58,0.7)',
              background: 'linear-gradient(90deg, rgba(201,148,58,0.15) 0%, rgba(201,148,58,0.07) 100%)',
              color: '#f0c96a', fontSize: 12.5, fontWeight: 600, letterSpacing: '0.04em',
              fontFamily: inter, backdropFilter: 'blur(12px)',
              boxShadow: '0 0 16px rgba(201,148,58,0.2), inset 0 1px 0 rgba(255,220,100,0.15)' }}>
              <span style={{ fontSize: 13 }}>✦</span>
              PubMed · Semantic Scholar · Europe PMC · Clinical Trials — built in
              <span style={{ fontSize: 13 }}>✦</span>
            </div>

            {/* Main headline — typewriter on last word */}
            <h1 className="fade-up-2" style={{ fontFamily: cinzel, fontWeight: 700, lineHeight: 1.08,
              marginBottom: 0, fontSize: 'clamp(3.2rem,5vw,5rem)', letterSpacing: '0.015em',
              color: '#f5eedd', textShadow: '0 2px 40px rgba(201,148,58,0.15)' }}>
              <span className="headline-word">The Smartest Way</span><br/>
              <span className="headline-word">to Write</span>{' '}
              <span className="text-fluid">Medical</span><br/>
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

            {/* Ornamental rule */}
            <div className="fade-up-3" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' }}>
              <div style={{ height: 1, width: 20, background: 'rgba(201,148,58,0.4)' }}/>
              <div style={{ height: 1, width: 40, background: 'rgba(201,148,58,0.7)' }}/>
              <svg width="14" height="14" viewBox="0 0 10 10" fill="#c9943a">
                <path d="M5 0L6.2 3.8L10 5L6.2 6.2L5 10L3.8 6.2L0 5L3.8 3.8Z"/>
              </svg>
              <div style={{ height: 1, width: 40, background: 'rgba(201,148,58,0.7)' }}/>
              <div style={{ height: 1, flex: 1, maxWidth: 160, background: 'linear-gradient(to right, rgba(201,148,58,0.4), transparent)' }}/>
            </div>

            {/* Sub-copy */}
            <div className="fade-up-3" style={{ marginBottom: 38, maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.6, color: 'rgba(210,185,140,0.9)', fontFamily: inter }}>
                ✕&nbsp; No more juggling{' '}
                <span style={{color:'#c9943a'}}>Word</span>,{' '}
                <span style={{color:'#c9943a'}}>Zotero</span>,{' '}
                <span style={{color:'#c9943a'}}>ChatGPT</span>,{' '}
                <span style={{color:'#c9943a'}}>PubMed</span>{' '}&amp;{' '}
                <span style={{color:'#c9943a'}}>Excel</span>.
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.6, color: 'rgba(210,185,140,0.9)', fontFamily: inter }}>
                ✕&nbsp; Write, review, cite and submit — in one place.
              </div>
            </div>

            {/* CTA */}
            <div className="fade-up-4">
              <Link href="/login" className="hero-cta-btn" style={{
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
                Get Started Free
              </Link>
            </div>


          </div>

          {/* ── Animated Workflow + Feature Cards ── */}
          <div className="fade-up-2 hero-right" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Journey Card ── */}
            <div style={{
              position: 'relative', borderRadius: 22, overflow: 'hidden',
              border: '1px solid rgba(201,148,58,0.22)',
              background: 'linear-gradient(160deg, rgba(12,16,32,0.9) 0%, rgba(5,8,15,0.95) 100%)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,148,58,0.08), 0 0 50px rgba(201,148,58,0.07)',
              padding: '28px 28px 24px',
              transform: `perspective(1000px) rotateY(${px * -3}deg) rotateX(${py * 2}deg)`,
              transition: 'transform 0.2s ease-out',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #8b6914 15%, #c9943a 35%, #f0d060 50%, #c9943a 65%, #8b6914 85%, transparent)' }}/>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 220, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(201,148,58,0.05) 0%, transparent 70%)', pointerEvents: 'none' }}/>

              <p style={{ textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: 'rgba(201,148,58,0.45)', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 26, fontFamily: cinzel, position: 'relative' }}>
                ✦ &nbsp; Research Journey &nbsp; ✦
              </p>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0, position: 'relative' }}>
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
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingBottom: 34, position: 'relative', minWidth: 0 }}>
                        <div style={{ width: '100%', height: 2, background: 'rgba(201,148,58,0.12)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                          <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'linear-gradient(90deg, transparent 0%, rgba(201,148,58,0.25) 20%, #c9943a 50%, rgba(201,148,58,0.25) 80%, transparent 100%)',
                            animation: `dotFlow 2s ${ni === 0 ? '0.4s' : '1.4s'} linear infinite`,
                          }}/>
                        </div>
                        <div style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-60%)', color: 'rgba(201,148,58,0.5)', fontSize: 10 }}>›</div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 22 }}>
                {[
                  ['Literature Review', 'Study Design', 'Ethics / IRB'],
                  ['Write Sections', 'AI Reviewer', 'Fix Citations'],
                  ['Journal Match', 'Submit', 'Revise & Accept'],
                ].map((col, ci) => col.map((pill, pi) => (
                  <div key={`${ci}-${pi}`} style={{
                    padding: '6px 8px', borderRadius: 8, textAlign: 'center',
                    background: 'rgba(201,148,58,0.05)', border: '1px solid rgba(201,148,58,0.1)',
                    fontSize: 9.5, color: 'rgba(240,232,208,0.45)', fontWeight: 500,
                    letterSpacing: '0.01em', transition: 'all 0.2s', cursor: 'default',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(201,148,58,0.12)'; (e.currentTarget as HTMLElement).style.color='rgba(240,232,208,0.8)'; (e.currentTarget as HTMLElement).style.borderColor='rgba(201,148,58,0.25)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(201,148,58,0.05)'; (e.currentTarget as HTMLElement).style.color='rgba(240,232,208,0.45)'; (e.currentTarget as HTMLElement).style.borderColor='rgba(201,148,58,0.1)' }}
                  >{pill}</div>
                )))}
              </div>

              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Link href="/login" style={{
                  fontFamily: inter, fontSize: 12, fontWeight: 600,
                  color: 'rgba(201,148,58,0.75)', textDecoration: 'none',
                  letterSpacing: '0.03em', transition: 'color 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color='#c9943a'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color='rgba(201,148,58,0.75)'}
                >
                  Explore the workspace →
                </Link>
              </div>
            </div>

            {/* ── Feature Cards — 3-D tilt ── */}
            <div className="hero-feature-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { icon: '✦', title: 'AI Reviewer',   desc: 'Instant section-by-section feedback', color: '#c9943a', glow: 'rgba(201,148,58,0.18)', delay: '0s' },
                { icon: '📎', title: 'Citations',     desc: 'Auto-generate bibliographies',         color: '#a78bfa', glow: 'rgba(167,139,250,0.15)', delay: '0.5s' },
                { icon: '🗂', title: 'Journal Match', desc: 'Find the best journal for your paper', color: '#60a5fa', glow: 'rgba(96,165,250,0.15)',  delay: '1s' },
              ].map(card => (
                <div
                  key={card.title}
                  data-glow={card.glow}
                  onMouseMove={tiltCard}
                  onMouseLeave={resetCard}
                  style={{
                    padding: '20px 14px 18px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid rgba(255,255,255,0.08)`,
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

      {/* ═══════════════════════════════════════════════════════════
          CTA BANNER
      ═══════════════════════════════════════════════════════════ */}
      <section style={{ background: '#0c0906', padding: '48px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Link href="/login" style={{ display: 'block', borderRadius: 18, overflow: 'hidden', textDecoration: 'none',
            boxShadow: '0 8px 60px rgba(0,0,0,0.7)', border: '1px solid rgba(180,130,20,0.15)' }}>
            <img src="/cta-banner.png" alt="Ready to publish better research?" style={{ width: '100%', height: 'auto', display: 'block' }}/>
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════ */}
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

      {/* cursor blink keyframe */}
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
