'use client'

import Link from 'next/link'

const STEPS = [
  {
    n: '01',
    icon: '📁',
    title: 'Create a Project',
    desc: 'Every manuscript starts with a project. Give it a title and study type.',
    action: { label: 'New Project →', href: '/new-project' },
    color: '#c9943a',
  },
  {
    n: '02',
    icon: '✍️',
    title: 'Write Section by Section',
    desc: 'Open your workspace. Pick a section — Abstract, Methods, Results — and start writing.',
    action: null,
    color: '#a78bfa',
  },
  {
    n: '03',
    icon: '✦',
    title: 'Get Mentor Feedback',
    desc: 'Hit "Get Mentor Feedback" in any section. Your AI mentor scores your work, explains why things need fixing, and asks guiding questions.',
    action: null,
    color: '#34d399',
  },
  {
    n: '04',
    icon: '⬇',
    title: 'Export & Submit',
    desc: 'When your manuscript is ready, export it as a .docx file and submit to your target journal.',
    action: null,
    color: '#60a5fa',
  },
]

export default function WorkflowGuide() {
  return (
    <div style={{
      marginBottom: 32,
      borderRadius: 20,
      border: '1px solid rgba(201,148,58,0.18)',
      background: 'rgba(255,255,255,0.015)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Gold top accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(201,148,58,0.5), transparent)' }} />

      {/* Header */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ fontSize: 10, color: 'rgba(201,148,58,0.6)', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, margin: '0 0 4px' }}>
          ✦ &nbsp; How it works
        </p>
        <h3 style={{
          fontSize: 16, fontWeight: 600, color: '#f0e8d0', margin: 0,
          fontFamily: "var(--font-cinzel),'Cormorant Garamond',Georgia,serif",
        }}>
          Your research workflow
        </h3>
      </div>

      {/* Steps */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 0,
      }}>
        {STEPS.map((s, i) => (
          <div key={s.n} style={{
            padding: '20px 22px',
            borderRight: i < STEPS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            position: 'relative',
          }}>
            {/* connector arrow (hidden on last) */}
            {i < STEPS.length - 1 && (
              <div style={{
                position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)',
                fontSize: 11, color: 'rgba(240,232,208,0.15)', zIndex: 2,
                display: 'none', // shown via CSS on wider screens
              }}>▶</div>
            )}

            {/* step number */}
            <div style={{
              fontSize: 10, fontWeight: 800, color: s.color, opacity: 0.5,
              letterSpacing: '0.1em', marginBottom: 10,
              fontFamily: "var(--font-cinzel),'Cormorant Garamond',Georgia,serif",
            }}>{s.n}</div>

            {/* icon + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: `rgba(${
                  s.color === '#c9943a' ? '201,148,58' :
                  s.color === '#a78bfa' ? '167,139,250' :
                  s.color === '#34d399' ? '52,211,153' :
                  '96,165,250'
                },0.1)`,
                border: `1px solid ${s.color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14,
              }}>{s.icon}</div>
              <span style={{
                fontSize: 13, fontWeight: 600, color: '#f0e8d0',
                fontFamily: "var(--font-inter),'DM Sans',system-ui,sans-serif",
              }}>{s.title}</span>
            </div>

            {/* description */}
            <p style={{
              fontSize: 12, color: 'rgba(240,232,208,0.38)', lineHeight: 1.6,
              margin: 0,
              fontFamily: "var(--font-inter),'DM Sans',system-ui,sans-serif",
            }}>{s.desc}</p>

            {/* optional CTA */}
            {s.action && (
              <Link href={s.action.href} style={{
                display: 'inline-block', marginTop: 12,
                fontSize: 11, fontWeight: 700, color: s.color,
                textDecoration: 'none', letterSpacing: '0.04em',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >{s.action.label}</Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
