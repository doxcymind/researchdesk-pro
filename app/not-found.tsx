'use client'
import Link from 'next/link'

const cinzel = "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif"
const inter  = "var(--font-inter), 'DM Sans', system-ui, sans-serif"

export default function NotFound() {
  return (
    <div style={{ background: '#080c18', minHeight: '100vh', color: '#f0e8d0', fontFamily: inter, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px' }}>
      {/* Glow */}
      <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(201,148,58,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
        {/* Ornament */}
        <p style={{ fontSize: 11, letterSpacing: '0.25em', color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', marginBottom: 20, fontFamily: cinzel }}>✦ &nbsp; 404 &nbsp; ✦</p>

        {/* Big number */}
        <div style={{ fontSize: 'clamp(80px, 18vw, 130px)', fontWeight: 700, lineHeight: 1, fontFamily: cinzel, letterSpacing: '-4px', marginBottom: 8 }}>
          <span style={{ color: 'rgba(240,232,208,0.08)' }}>4</span>
          <span style={{ color: '#c9943a', textShadow: '0 0 60px rgba(201,148,58,0.3)' }}>0</span>
          <span style={{ color: 'rgba(240,232,208,0.08)' }}>4</span>
        </div>

        <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 600, color: '#f0e8d0', margin: '0 0 12px', fontFamily: cinzel, letterSpacing: '0.02em' }}>
          Page Not Found
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(240,232,208,0.35)', lineHeight: 1.7, margin: '0 0 36px' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{
            textDecoration: 'none', padding: '12px 28px', borderRadius: 11,
            background: 'linear-gradient(135deg, #c9943a, #e8b84a)',
            color: '#080c18', fontWeight: 700, fontSize: 13, fontFamily: inter,
          }}>
            Go to Dashboard
          </Link>
          <Link href="/" style={{
            textDecoration: 'none', padding: '12px 28px', borderRadius: 11,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(240,232,208,0.6)', fontWeight: 600, fontSize: 13, fontFamily: inter,
          }}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
