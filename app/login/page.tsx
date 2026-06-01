'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const FEATURES = [
  { icon: '✦', text: 'Autosaves every keystroke',      sub: 'Never lose a word' },
  { icon: '⬡', text: 'All projects in one place',      sub: 'Organised by study type' },
  { icon: '◉', text: 'AI review in seconds',           sub: 'Section-by-section feedback' },
  { icon: '⊞', text: 'Auto-generate citations',        sub: 'Vancouver, APA, AMA & more' },
]

const TYPEWORDS = ['faster.', 'smarter.', 'together.', 'published.']

function LoginContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  /* typewriter */
  const [wIdx, setWIdx]       = useState(0)
  const [displayed, setDisp]  = useState('')
  const [deleting, setDel]    = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const target = TYPEWORDS[wIdx]
    let t: NodeJS.Timeout
    if (!deleting && displayed.length < target.length)
      t = setTimeout(() => setDisp(target.slice(0, displayed.length + 1)), 90)
    else if (!deleting && displayed.length === target.length)
      t = setTimeout(() => setDel(true), 2000)
    else if (deleting && displayed.length > 0)
      t = setTimeout(() => setDisp(displayed.slice(0, -1)), 50)
    else { setDel(false); setWIdx((wIdx + 1) % TYPEWORDS.length) }
    return () => clearTimeout(t)
  }, [mounted, wIdx, displayed, deleting])

  const loginWithGoogle = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    })
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#080c18',
      display: 'flex', fontFamily: "var(--font-inter), 'DM Sans', system-ui, sans-serif",
      color: '#f0e8d0', overflow: 'hidden', position: 'relative',
    }}>
      {/* animated background */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="orb-1" style={{ position: 'absolute', top: '5%', left: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,148,58,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }}/>
        <div className="orb-2" style={{ position: 'absolute', bottom: '5%', right: '-5%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,105,20,0.08) 0%, transparent 70%)', filter: 'blur(80px)' }}/>
        <div className="orb-3" style={{ position: 'absolute', top: '50%', left: '35%', transform: 'translate(-50%,-50%)', width: 900, height: 500, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(201,148,58,0.04) 0%, transparent 60%)', filter: 'blur(80px)' }}/>
        {/* drifting grid */}
        <div className="grid-drift" style={{ position: 'absolute', inset: 0, opacity: 0.025,
          backgroundImage: 'linear-gradient(rgba(201,148,58,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,148,58,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px' }}/>
      </div>

      {/* Left — branding panel */}
      <div className="login-left" style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 80px', position: 'relative', zIndex: 1,
      }}>
        {/* Logo */}
        <div className="fade-up-1" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 56 }}>
          <img src="/logo.webp" alt="R" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', border: '1px solid rgba(201,148,58,0.3)', boxShadow: '0 0 20px rgba(201,148,58,0.2)' }}/>
          <span style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif", letterSpacing: '0.03em' }}>
            <span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span>
          </span>
        </div>

        {/* Headline with typewriter */}
        <div className="fade-up-2" style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16 }}>✦ &nbsp; Medical Research Platform</p>
          <h1 style={{
            fontSize: 'clamp(2.4rem, 4vw, 3.6rem)', fontWeight: 600, lineHeight: 1.1, margin: 0,
            fontFamily: "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif",
            letterSpacing: '0.01em',
          }}>
            Research,<br/>
            <span className="text-shimmer" style={{ WebkitTextFillColor: 'transparent' }}>
              {displayed}
            </span>
            <span style={{ display: 'inline-block', width: 3, height: '0.8em', background: '#c9943a', marginLeft: 3, verticalAlign: 'middle', borderRadius: 1, animation: 'cursorBlink 1s step-end infinite' }}/>
          </h1>
        </div>

        {/* ornament */}
        <div className="fade-up-3" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{ height: 1, width: 30, background: 'rgba(201,148,58,0.5)' }}/>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="#c9943a" opacity="0.7"><path d="M5 0L6.2 3.8L10 5L6.2 6.2L5 10L3.8 6.2L0 5L3.8 3.8Z"/></svg>
          <div style={{ height: 1, flex: 1, maxWidth: 120, background: 'linear-gradient(to right, rgba(201,148,58,0.5), transparent)' }}/>
        </div>

        {/* Features */}
        <div className="fade-up-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {FEATURES.map((f, i) => (
            <div key={f.text} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              animation: `fadeInUp 0.4s ${0.6 + i * 0.1}s both`,
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(201,148,58,0.05)'; (e.currentTarget as HTMLElement).style.borderColor='rgba(201,148,58,0.15)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'; (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.05)' }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: 'rgba(201,148,58,0.1)', border: '1px solid rgba(201,148,58,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: '#c9943a',
              }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,232,208,0.8)', marginBottom: 2 }}>{f.text}</div>
                <div style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)' }}>{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — login card */}
      <div className="login-right" style={{
        width: 460, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 52px', position: 'relative', zIndex: 1,
        borderLeft: '1px solid rgba(201,148,58,0.1)',
        background: 'rgba(255,255,255,0.015)',
      }}>
        {/* gold top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(201,148,58,0.5), transparent)' }}/>
        {/* corner ornaments */}
        <svg style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none' }} width={60} height={60} viewBox="0 0 60 60">
          <path d="M60 0 L40 0 L60 20 Z" fill="rgba(201,148,58,0.05)"/>
          <path d="M58 2 L44 2 M58 2 L58 16" stroke="rgba(201,148,58,0.2)" strokeWidth="1" fill="none"/>
        </svg>
        <svg style={{ position: 'absolute', bottom: 0, left: 0, pointerEvents: 'none' }} width={60} height={60} viewBox="0 0 60 60">
          <path d="M0 60 L20 60 L0 40 Z" fill="rgba(201,148,58,0.05)"/>
          <path d="M2 58 L16 58 M2 58 L2 44" stroke="rgba(201,148,58,0.2)" strokeWidth="1" fill="none"/>
        </svg>

        <div style={{ width: '100%', animation: 'fadeInUp 0.5s 0.2s both' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h2 style={{ fontSize: 30, fontWeight: 600, margin: '0 0 8px', letterSpacing: '0.01em', fontFamily: "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif" }}>Your research workspace</h2>
            <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.4)', margin: 0 }}>Sign in or create your account to continue</p>
          </div>

          {message && (
            <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 24, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', fontSize: 13 }}>
              {message}
            </div>
          )}

          <button
            onClick={loginWithGoogle}
            disabled={loading}
            style={{
              width: '100%', padding: '15px 20px', borderRadius: 14,
              backgroundImage: 'linear-gradient(135deg, #c9943a 0%, #e8b84a 50%, #c9943a 100%)',
              backgroundColor: 'transparent',
              opacity: loading ? 0.6 : 1,
              color: '#080c18', fontSize: 15, fontWeight: 800,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              transition: 'all 0.25s',
              boxShadow: '0 8px 32px rgba(201,148,58,0.25), 0 0 0 1px rgba(201,148,58,0.2)',
              fontFamily: "var(--font-inter), sans-serif",
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 12px 40px rgba(201,148,58,0.4), 0 0 0 1px rgba(201,148,58,0.35)' } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow='0 8px 32px rgba(201,148,58,0.25), 0 0 0 1px rgba(201,148,58,0.2)' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(8,12,24,0.3)', borderTopColor: '#080c18', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/>
                Signing in…
              </span>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }}/>
            <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.2)', letterSpacing: '0.08em' }}>SECURE SIGN-IN</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { icon: '🔒', label: 'Encrypted' },
              { icon: '🏥', label: 'Medical-grade' },
              { icon: '🔏', label: 'Private' },
            ].map(b => (
              <div key={b.label} style={{
                textAlign: 'center', padding: '10px 8px', borderRadius: 10,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{b.icon}</div>
                <div style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)', letterSpacing: '0.04em' }}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense><LoginContent /></Suspense>
}
