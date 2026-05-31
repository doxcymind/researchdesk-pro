'use client'
import Link from 'next/link'

const cinzel   = "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif"
const playfair = "var(--font-playfair), 'Playfair Display', Georgia, serif"
const inter    = "var(--font-inter), 'DM Sans', system-ui, sans-serif"

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
            fontFamily: inter, color: item.href === '/researchers' ? '#c9943a' : 'rgba(200,175,120,0.55)',
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

const ROLES = [
  { role: 'Medical Students', icon: '🎓', color: '#a78bfa', points: ['Write your first case report with AI guidance', 'Understand IMRAD structure step by step', 'Auto-generate citations as you write', 'Find student-friendly journals to submit to', 'Build a publication record early in your career'] },
  { role: 'Residents & Fellows', icon: '🏥', color: '#c9943a', points: ['Document complex cases efficiently', 'AI reviewer catches errors before submission', 'Track all your submissions in one place', 'Build your publication record faster', 'Get journal-specific formatting in one click'] },
  { role: 'Faculty & Consultants', icon: '⚕️', color: '#34d399', points: ['Manage multiple manuscripts simultaneously', 'Systematic review and meta-analysis support', 'IEC/IRB documentation checklists', 'Journal impact factor matching', 'Mentor student co-authors within the same workspace'] },
  { role: 'PhD & Research Scholars', icon: '🔬', color: '#60a5fa', points: ['Full thesis workspace with all chapters', 'Literature review organisation', 'Statistical results write-up assistance', 'Publication-ready formatting', 'Track revisions and reviewer comments'] },
]

const TESTIMONIALS = [
  { quote: 'ResearchDesk cut my case report writing time from 3 weeks to 3 days. The AI reviewer caught errors I would have missed.', name: 'Dr. A. Patel', role: 'Surgical Resident, AIIMS' },
  { quote: 'Finally a tool that understands research structure. My thesis chapter drafts are now 10x faster to produce.', name: 'Dr. S. Khan', role: 'PhD Scholar, Medical University' },
  { quote: 'The journal selector alone saved me two rejections. It matched my review article to exactly the right journal.', name: 'Prof. R. Mehta', role: 'Associate Professor, Medicine' },
]

export default function ResearchersPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#05080f', color: '#f0e8d0', fontFamily: inter }}>
      <Nav />

      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '90px 56px 80px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.025, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(201,148,58,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,148,58,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }}/>
        <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16, fontFamily: cinzel, position: 'relative' }}>✦ &nbsp; For Researchers</p>
        <h1 style={{ fontFamily: cinzel, fontSize: 'clamp(2.4rem, 4vw, 3.6rem)', fontWeight: 600, color: '#f0e8d0', margin: '0 auto 20px', lineHeight: 1.1, maxWidth: 700, position: 'relative' }}>
          Built for every stage<br/><span style={{ color: '#c9943a' }}>of your research career</span>
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(240,232,208,0.4)', maxWidth: 540, margin: '0 auto', lineHeight: 1.7, position: 'relative' }}>
          Whether you're a medical student writing your first case report or a faculty member managing 10 manuscripts — ResearchDesk meets you where you are.
        </p>
      </div>

      {/* Role cards */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 56px 80px' }}>
        <div className="grid-2" style={{ marginBottom: 80 }}>
          {ROLES.map(card => (
            <div key={card.role} style={{
              padding: '32px 30px', borderRadius: 20,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
              transition: 'transform 0.2s, border-color 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-3px)'; (e.currentTarget as HTMLElement).style.borderColor=`${card.color}44` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.07)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${card.color}18`, border: `1px solid ${card.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{card.icon}</div>
                <h3 style={{ fontSize: 19, fontWeight: 700, color: card.color, margin: 0, fontFamily: cinzel }}>{card.role}</h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
                {card.points.map(p => (
                  <li key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'rgba(240,232,208,0.55)', lineHeight: 1.55 }}>
                    <span style={{ color: card.color, flexShrink: 0, marginTop: 2 }}>✦</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: cinzel }}>✦ &nbsp; What researchers say</p>
        </div>
        <div className="grid-3" style={{ gap: 20, marginBottom: 72 }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={{ padding: '26px', borderRadius: 18, background: 'rgba(201,148,58,0.04)', border: '1px solid rgba(201,148,58,0.12)' }}>
              <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.55)', lineHeight: 1.75, margin: '0 0 18px', fontFamily: playfair, fontStyle: 'italic' }}>"{t.quote}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #c9943a, #8b6914)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#080c18', flexShrink: 0 }}>{t.name[4]}</div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#c9943a', margin: 0 }}>{t.name}</p>
                  <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: 0 }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg, #e0b545 0%, #a06808 100%)',
            color: '#0a0600', padding: '16px 40px', borderRadius: 12,
            fontSize: 14, fontWeight: 800, textDecoration: 'none', fontFamily: inter,
            boxShadow: '0 8px 40px rgba(180,120,8,0.5)',
          }}>
            Join researchers already using ResearchDesk
          </Link>
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
