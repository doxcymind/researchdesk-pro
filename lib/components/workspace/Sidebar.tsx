'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SidebarProps {
  sections: string[]
  selectedSection: string
  setSelectedSection: (section: string) => void
  onExit: () => void
  onDelete?: () => void
}

const SECTION_ICONS: Record<string, string> = {
  'Overview':             '◈',
  'Abstract':             '✦',
  'Introduction':         '⬡',
  'Case Presentation':    '📋',
  'Case Presentations':   '📋',
  'Literature Review':    '📖',
  'Body':                 '✍',
  'Methods':              '⚙',
  'Results':              '◉',
  'Discussion':           '◎',
  'Conclusion':           '✓',
  'Recommendations':      '💡',
  'References':           '⊞',
  'Authors':              '👤',
  'Uploads':              '↑',
  'Citation Generator':   '📎',
  'Journal Selector':     '🗂',
  'Submission Checklist': '☑',
  'Rejection Tracker':    '📊',
  'AI Assistant':         '✧',
  'Clinical Trials':      '🔬',
  'DOI Resolver':         '🔍',
  'Zotero':               'Z',
  'Plagiarism Check':     '⚑',
}

const TOOL_ITEMS = ['Authors','AI Assistant','Uploads','Clinical Trials','DOI Resolver','Citation Generator','Journal Selector','Submission Checklist','Rejection Tracker']

export default function Sidebar({ sections, selectedSection, setSelectedSection, onExit, onDelete }: SidebarProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  // Arrow key navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      e.preventDefault()
      const idx = sections.indexOf(selectedSection)
      if (e.key === 'ArrowUp'   && idx > 0)                setSelectedSection(sections[idx - 1])
      if (e.key === 'ArrowDown' && idx < sections.length - 1) setSelectedSection(sections[idx + 1])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sections, selectedSection, setSelectedSection])

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="ws-sidebar-desktop" style={{
        width: 240, background: 'rgba(255,255,255,0.02)',
        borderRight: '1px solid rgba(201,148,58,0.12)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        height: '100vh', position: 'sticky', top: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.webp" alt="R" style={{ width: 30, height: 30, borderRadius: 7, objectFit: 'cover' }} />
            <span style={{ fontSize: 15, fontWeight: 700 }}><span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span></span>
          </Link>
        </div>

        {/* Nav — groups derived dynamically from the sections prop */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 10px' }}>
          {[
            { label: 'MANUSCRIPT', items: sections.filter(s => s !== 'Overview' && !TOOL_ITEMS.includes(s)) },
            { label: 'TOOLS',      items: sections.filter(s => TOOL_ITEMS.includes(s)) },
          ].map((group) => (
            <div key={group.label} style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(201,148,58,0.5)', letterSpacing: '0.1em', padding: '0 10px', marginBottom: 6 }}>
                {group.label}
              </p>
              {(group.label === 'MANUSCRIPT' ? ['Overview', ...group.items] : group.items).map((section) => {
                const active = selectedSection === section
                return (
                  <button key={section} onClick={() => setSelectedSection(section)} style={{
                    width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 12px', borderRadius: 9, marginBottom: 2,
                    background: active ? 'rgba(201,148,58,0.14)' : 'transparent',
                    border: active ? '1px solid rgba(201,148,58,0.28)' : '1px solid transparent',
                    color: active ? '#e8c878' : 'rgba(240,232,208,0.5)',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 13, opacity: 0.7, width: 16, textAlign: 'center', flexShrink: 0 }}>
                      {SECTION_ICONS[section] || '·'}
                    </span>
                    {section}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Exit + Delete */}
        <div style={{ padding: '12px 10px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onExit} style={{
            width: '100%', padding: '10px 0', borderRadius: 10,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          }}>← Exit Workspace</button>

          {onDelete && !showConfirm && (
            <button onClick={() => setShowConfirm(true)} style={{
              width: '100%', padding: '7px 0', borderRadius: 10,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(240,232,208,0.25)', fontSize: 11, cursor: 'pointer', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(248,113,113,0.6)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(240,232,208,0.25)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
            >🗑 Delete Project</button>
          )}

          {onDelete && showConfirm && (
            <div style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontSize: 11, color: 'rgba(248,113,113,0.8)', margin: '0 0 8px', lineHeight: 1.5, textAlign: 'center' }}>Delete this project permanently?</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(240,232,208,0.5)', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                <button onClick={onDelete} style={{ flex: 1, padding: '6px 0', borderRadius: 7, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── MOBILE TOP NAV ── */}
      <div className="ws-sidebar-mobile" style={{
        width: '100%', background: 'rgba(5,8,15,0.95)',
        borderBottom: '1px solid rgba(201,148,58,0.15)',
        display: 'none', flexDirection: 'column',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        {/* Top bar: logo + exit */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.webp" alt="R" style={{ width: 26, height: 26, borderRadius: 6, objectFit: 'cover' }} />
            <span style={{ fontSize: 14, fontWeight: 700 }}><span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span></span>
          </Link>
          <button onClick={onExit} style={{
            padding: '6px 14px', borderRadius: 8,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>← Exit</button>
        </div>

        {/* Scrollable section pills */}
        <div style={{ overflowX: 'auto', display: 'flex', gap: 6, padding: '8px 12px', scrollbarWidth: 'none' }}>
          {sections.map((section) => {
            const active = selectedSection === section
            return (
              <button key={section} onClick={() => setSelectedSection(section)} style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: 20,
                background: active ? 'rgba(201,148,58,0.18)' : 'rgba(255,255,255,0.04)',
                border: active ? '1px solid rgba(201,148,58,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: active ? '#e8c878' : 'rgba(240,232,208,0.5)',
                fontSize: 12, fontWeight: active ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ fontSize: 11 }}>{SECTION_ICONS[section] || '·'}</span>
                {section}
              </button>
            )
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .ws-sidebar-desktop { display: none !important; }
          .ws-sidebar-mobile { display: flex !important; }
        }
      `}</style>
    </>
  )
}
