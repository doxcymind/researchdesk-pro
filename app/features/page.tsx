'use client'
import Link from 'next/link'

const cinzel = "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif"
const inter  = "var(--font-inter), 'DM Sans', system-ui, sans-serif"

const NAV_LINKS = [
  { label: 'Features',        href: '/features' },
  { label: 'For Researchers', href: '/researchers' },
]

function Nav() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 56px',
      borderTop: '2px solid rgba(201,148,58,0.55)',
      borderBottom: '1px solid rgba(201,148,58,0.15)',
      background: 'rgba(5,8,15,0.85)', backdropFilter: 'blur(24px)',
      boxShadow: '0 1px 40px rgba(0,0,0,0.6)',
    }}>
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 11 }}>
        <img src="/logo.webp" alt="ResearchDesk" style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover', border: '1px solid rgba(201,148,58,0.3)' }}/>
        <span style={{ fontFamily: cinzel, fontSize: 20, fontWeight: 700, letterSpacing: '0.04em' }}>
          <span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span>
        </span>
      </Link>
      <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        {NAV_LINKS.map(item => (
          <Link key={item.label} href={item.href} className="nav-link" style={{
            fontFamily: inter, color: item.href === '/features' ? '#c9943a' : 'rgba(200,175,120,0.55)',
            fontSize: 13, letterSpacing: '0.02em', textDecoration: 'none',
          }}>{item.label}</Link>
        ))}
        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg, #e0b545 0%, #a06808 100%)',
          color: '#0a0600', padding: '9px 22px', borderRadius: 8,
          fontSize: 12, fontWeight: 800, textDecoration: 'none', fontFamily: inter,
          boxShadow: '0 4px 20px rgba(180,120,8,0.4)', letterSpacing: '0.01em',
        }}>Get Started</Link>
      </div>
    </nav>
  )
}

const FEATURES = [
  { icon: '✦', color: '#c9943a', glow: 'rgba(201,148,58,0.15)', title: 'AI Manuscript Writing', desc: 'Generate section drafts (Abstract, Introduction, Methods, Results, Discussion) tailored to your study type with one click. Stop staring at a blank page.' },
  { icon: '◉', color: '#a78bfa', glow: 'rgba(167,139,250,0.12)', title: 'AI Section Reviewer', desc: 'Get instant AI feedback on any section — scored 0–100 with specific errors, warnings, and strengths highlighted. Fix issues before peer review.' },
  { icon: '⊞', color: '#60a5fa', glow: 'rgba(96,165,250,0.12)', title: 'Citation Generator', desc: 'Paste any reference and auto-format in Vancouver, APA, AMA, Harvard, or MLA with a single click. Zotero library integration included.' },
  { icon: '🗂', color: '#34d399', glow: 'rgba(52,211,153,0.12)', title: 'Journal Selector', desc: 'Search 30,000+ journals via OpenAlex. Filter by impact factor, open access, and study type to find your perfect match and avoid desk rejection.' },
  { icon: '📊', color: '#fbbf24', glow: 'rgba(251,191,36,0.1)', title: 'Rejection Tracker', desc: 'Log submission history, track decisions, and see patterns in rejections to improve your next submission strategy. Build a clear publication record.' },
  { icon: '✧', color: '#f0e8d0', glow: 'rgba(240,232,208,0.08)', title: 'AI Research Assistant', desc: 'Project-aware chat assistant that knows your study type and title. Ask methodology questions, get writing advice, and refine arguments in context.' },
  { icon: '📁', color: '#fb923c', glow: 'rgba(251,146,60,0.1)', title: 'File Uploads', desc: 'Upload PDFs, images, and documents directly into your project workspace. Keep all your source materials alongside your manuscript.' },
  { icon: '🔄', color: '#e879f9', glow: 'rgba(232,121,249,0.1)', title: 'Auto-Save Editor', desc: 'Never lose a word. The manuscript editor auto-saves every keystroke with a live word count and real-time section tracking.' },
  { icon: '⚗️', color: '#2dd4bf', glow: 'rgba(45,212,191,0.1)', title: 'Study Type Templates', desc: 'Structured workspace for RCTs, case reports, systematic reviews, cohort studies, and more — with IMRAD-aligned section checklists.' },
]

export default function FeaturesPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080c18', color: '#f0e8d0', fontFamily: inter }}>
      <Nav />

      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '90px 56px 80px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 500, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(201,148,58,0.06) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16, fontFamily: cinzel }}>✦ &nbsp; Features</p>
        <h1 style={{ fontFamily: cinzel, fontSize: 'clamp(2.4rem, 4vw, 3.6rem)', fontWeight: 600, color: '#f0e8d0', margin: '0 auto 20px', lineHeight: 1.1, maxWidth: 700 }}>
          Everything you need to<br/><span style={{ color: '#c9943a' }}>publish great research</span>
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(240,232,208,0.4)', maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>
          A complete platform built specifically for medical and academic researchers — from first draft to final publication.
        </p>
      </div>

      {/* Feature grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 56px 100px' }}>
        <div className="grid-3">
          {FEATURES.map(f => (
            <div key={f.title} style={{
              padding: '28px 26px', borderRadius: 20,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              position: 'relative', overflow: 'hidden',
              transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-4px)'; (e.currentTarget as HTMLElement).style.borderColor=f.glow.replace('0.15','0.35').replace('0.12','0.3').replace('0.1','0.25').replace('0.08','0.2'); (e.currentTarget as HTMLElement).style.boxShadow=`0 16px 50px rgba(0,0,0,0.5), 0 0 30px ${f.glow}` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.boxShadow='' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${f.color}44, transparent)` }}/>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${f.glow} 0%, transparent 70%)`, pointerEvents: 'none' }}/>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: f.glow, border: `1px solid ${f.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: f.color, marginBottom: 18 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f0e8d0', margin: '0 0 10px', fontFamily: cinzel, letterSpacing: '0.02em' }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.45)', lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: 72 }}>
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg, #e0b545 0%, #a06808 100%)',
            color: '#0a0600', padding: '16px 40px', borderRadius: 12,
            fontSize: 14, fontWeight: 800, textDecoration: 'none', fontFamily: inter,
            boxShadow: '0 8px 40px rgba(180,120,8,0.5)',
          }}>
            Start for free — no credit card needed
          </Link>
          <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.2)', marginTop: 14 }}>
            Free plan includes AI manuscript writing, citation generator, and journal search.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(180,130,20,0.12)', background: '#0c0906', padding: '26px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#4a3820', fontSize: 12 }}>
          <div style={{ fontFamily: cinzel, letterSpacing: '0.05em' }}>© 2026 ResearchDesk. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 30 }}>
            {[{ label: 'Privacy Policy', href: '/privacy' }, { label: 'Terms of Service', href: '/terms' }, { label: 'Contact', href: '/contact' }].map(t => (
              <Link key={t.label} href={t.href} style={{ color: '#4a3820', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#c9943a')}
                onMouseLeave={e => (e.currentTarget.style.color = '#4a3820')}>{t.label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
