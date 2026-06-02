'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const cinzel = "var(--font-cinzel),'Cormorant Garamond',Georgia,serif"
const inter  = "var(--font-inter),'DM Sans',system-ui,sans-serif"

interface Section { section: string; content: string }

export default function SharePage() {
  const { token } = useParams()
  const [project,  setProject]  = useState<{ title: string; study_type: string } | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [active,   setActive]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    fetch(`/api/share?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setProject(d.project)
        const filled = (d.sections || []).filter((s: Section) => s.content?.trim())
        setSections(filled)
        setActive(filled[0]?.section || '')
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [token])

  const activeContent = sections.find(s => s.section === active)?.content || ''

  if (loading) return (
    <div style={{ background: '#080c18', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(240,232,208,0.3)', fontFamily: inter }}>
      Loading manuscript…
    </div>
  )

  if (error || !project) return (
    <div style={{ background: '#080c18', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#f0e8d0', fontFamily: inter, gap: 16, padding: 24 }}>
      <div style={{ fontSize: 40, opacity: 0.2 }}>✦</div>
      <p style={{ color: 'rgba(240,232,208,0.4)', fontSize: 14 }}>{error || 'This share link is invalid or has expired.'}</p>
      <Link href="/" style={{ color: '#c9943a', fontSize: 13, textDecoration: 'none' }}>← ResearchDesk</Link>
    </div>
  )

  return (
    <div style={{ background: '#080c18', minHeight: '100vh', color: '#f0e8d0', fontFamily: inter }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(201,148,58,0.15)', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,8,15,0.9)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 40, borderTop: '2px solid rgba(201,148,58,0.4)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.webp" alt="R" style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'cover' }} />
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: cinzel }}><span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span></span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', padding: '4px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>Read-only</span>
          <Link href="/login" style={{ fontSize: 12, color: '#c9943a', textDecoration: 'none', padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(201,148,58,0.3)', background: 'rgba(201,148,58,0.08)' }}>Start Writing →</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(24px,4vw,48px) clamp(16px,4vw,32px)' }}>
        {/* Title */}
        <div style={{ marginBottom: 32 }}>
          <span style={{ fontSize: 10, color: 'rgba(201,148,58,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: cinzel }}>✦ Shared Manuscript</span>
          <h1 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 600, color: '#f0e8d0', margin: '8px 0 6px', fontFamily: cinzel, lineHeight: 1.2 }}>{project.title.charAt(0).toUpperCase() + project.title.slice(1)}</h1>
          <span style={{ fontSize: 12, color: '#34d399', padding: '3px 12px', borderRadius: 20, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>{project.study_type}</span>
        </div>

        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Section tabs */}
          <div style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 80 }}>
            <p style={{ fontSize: 10, color: 'rgba(201,148,58,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 700 }}>Sections</p>
            {sections.map(s => (
              <button key={s.section} onClick={() => setActive(s.section)} style={{ padding: '8px 12px', borderRadius: 9, textAlign: 'left', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', background: active === s.section ? 'rgba(201,148,58,0.12)' : 'transparent', border: active === s.section ? '1px solid rgba(201,148,58,0.25)' : '1px solid transparent', color: active === s.section ? '#e8c878' : 'rgba(240,232,208,0.45)', fontWeight: active === s.section ? 600 : 400, transition: 'all 0.15s' }}>
                {s.section}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {active && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 'clamp(20px,3vw,32px)' }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, color: '#f0e8d0', margin: '0 0 20px', fontFamily: cinzel }}>{active}</h2>
                <p style={{ fontSize: 15, lineHeight: 1.85, color: 'rgba(240,232,208,0.75)', whiteSpace: 'pre-wrap', margin: 0 }}>{activeContent}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div style={{ marginTop: 48, padding: '24px 28px', borderRadius: 16, background: 'rgba(201,148,58,0.05)', border: '1px solid rgba(201,148,58,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#f0e8d0', margin: '0 0 4px' }}>Write your own manuscript on ResearchDesk</p>
            <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0 }}>AI-assisted writing, peer review simulation, citation tools & more</p>
          </div>
          <Link href="/login" style={{ textDecoration: 'none', padding: '11px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #c9943a, #e8b84a)', color: '#080c18', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
            Get Started Free →
          </Link>
        </div>
      </div>
    </div>
  )
}
