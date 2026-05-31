'use client'
import { useState } from 'react'

interface WorkspaceHeaderProps {
  title: string
  studyType: string
  onExport?: () => Promise<void>
  onShare?: () => Promise<void>
}

export default function WorkspaceHeader({ title, studyType, onExport, onShare }: WorkspaceHeaderProps) {
  const [exporting, setExporting] = useState(false)
  const [sharing, setSharing] = useState(false)

  const handleExport = async () => {
    if (!onExport) return
    setExporting(true)
    await onExport()
    setExporting(false)
  }

  const handleShare = async () => {
    if (!onShare) return
    setSharing(true)
    await onShare()
    setSharing(false)
  }

  return (
    <div style={{
      marginBottom: 28,
      padding: '18px 24px',
      background: 'rgba(201,148,58,0.06)',
      border: '1px solid rgba(201,148,58,0.18)',
      borderRadius: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontWeight: 600 }}>
          Current Project
        </p>
        <h1 style={{ fontSize: 'clamp(16px, 3vw, 24px)', fontWeight: 600, color: '#f0e8d0', letterSpacing: '0.01em', margin: 0, fontFamily: 'var(--font-cinzel), Cormorant Garamond, Georgia, serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
          background: 'rgba(52,211,153,0.12)', color: '#34d399',
          border: '1px solid rgba(52,211,153,0.2)',
          whiteSpace: 'nowrap',
        }}>
          {studyType || 'Research'}
        </span>

        {onShare && (
          <button
            onClick={handleShare}
            disabled={sharing}
            title="Share a read-only link to this manuscript"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 9,
              background: sharing ? 'rgba(99,179,237,0.08)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(99,179,237,0.2)',
              color: sharing ? 'rgba(99,179,237,0.5)' : 'rgba(99,179,237,0.7)',
              fontSize: 12, fontWeight: 600, cursor: sharing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (!sharing) { (e.currentTarget as HTMLElement).style.background='rgba(99,179,237,0.1)'; (e.currentTarget as HTMLElement).style.color='#63b3ed' } }}
            onMouseLeave={e => { if (!sharing) { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color='rgba(99,179,237,0.7)' } }}
          >
            {sharing ? '⏳' : '🔗'} {sharing ? 'Copying…' : 'Share'}
          </button>
        )}

        {onExport && (
          <button
            onClick={handleExport}
            disabled={exporting}
            title="Export full manuscript as Markdown"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 9,
              background: exporting ? 'rgba(201,148,58,0.08)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(201,148,58,0.2)',
              color: exporting ? 'rgba(201,148,58,0.5)' : 'rgba(201,148,58,0.7)',
              fontSize: 12, fontWeight: 600, cursor: exporting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (!exporting) { (e.currentTarget as HTMLElement).style.background='rgba(201,148,58,0.1)'; (e.currentTarget as HTMLElement).style.color='#c9943a' } }}
            onMouseLeave={e => { if (!exporting) { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color='rgba(201,148,58,0.7)' } }}
          >
            {exporting ? '⏳' : '⬇'} {exporting ? 'Exporting…' : 'Export'}
          </button>
        )}
      </div>
    </div>
  )
}
