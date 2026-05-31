'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

interface ReviewIssue {
  type: 'error' | 'warning' | 'success'
  title: string
  detail: string
}

interface ReviewData {
  score: number
  summary: string
  issues: ReviewIssue[]
}

interface EditorPanelProps {
  selectedSection: string
  content: string
  setContent: (value: string) => void
  saving: boolean
  generating: boolean   // kept for compat — unused now
  onGenerate: () => void // kept for compat — unused now
  reviewing: boolean
  reviewData: ReviewData | null
  onReview: () => void
  onCloseReview: () => void
  onSave?: () => void
}

const WORD_LIMITS: Record<string, number> = {
  Abstract: 250,
  Introduction: 500,
  Methods: 600,
  Results: 600,
  Discussion: 800,
  References: 0,
}

function wordCount(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

const ISSUE_CONFIG = {
  error:   { icon: '✕', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  warning: { icon: '⚠', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  success: { icon: '✓', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
}

function ScoreRing({ score }: { score: number }) {
  const r = 32
  const circ = 2 * Math.PI * r
  const filled = circ * (score / 100)
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#f59e0b' : '#f87171'

  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
      <circle
        cx="44" cy="44" r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 44 44)"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x="44" y="47" textAnchor="middle" fill={color} fontSize="16" fontWeight="800">{score}</text>
      <text x="44" y="60" textAnchor="middle" fill="rgba(240,232,208,0.3)" fontSize="8">/100</text>
    </svg>
  )
}

export default function EditorPanel({
  selectedSection,
  content,
  setContent,
  saving,
  reviewing,
  reviewData,
  onReview,
  onCloseReview,
  onSave,
}: EditorPanelProps) {
  const count = wordCount(content)
  const limit = WORD_LIMITS[selectedSection] || 0
  const isOver = limit > 0 && count > limit
  const panelRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordsLoading, setKeywordsLoading] = useState(false)
  const [copiedKw, setCopiedKw] = useState<string | null>(null)
  const isAbstract = selectedSection === 'Abstract'

  const suggestKeywords = async () => {
    if (!content.trim() || keywordsLoading) return
    setKeywordsLoading(true)
    setKeywords([])
    try {
      const { apiFetch } = await import('@/lib/api-fetch')
      const res = await apiFetch('/api/keywords', {
        method: 'POST',
        body: JSON.stringify({ abstract: content }),
      })
      const data = await res.json()
      if (data.keywords) setKeywords(data.keywords)
    } catch {}
    setKeywordsLoading(false)
  }

  const copyKeyword = (kw: string) => {
    navigator.clipboard.writeText(kw)
    setCopiedKw(kw)
    setTimeout(() => setCopiedKw(null), 1500)
  }

  const copyAllKeywords = () => {
    navigator.clipboard.writeText(keywords.join('; '))
    setCopiedKw('__all__')
    setTimeout(() => setCopiedKw(null), 1500)
  }

  const copyToClipboard = useCallback(async () => {
    if (!content.trim()) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content])

  // Cmd+S / Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        onSave?.()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSave])

  // Scroll review panel to top when new data arrives
  useEffect(() => {
    if (reviewData && panelRef.current) {
      panelRef.current.scrollTop = 0
    }
  }, [reviewData])

  const canReview = content.trim().length >= 20

  return (
    <div className="editor-root" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

      {/* ── Left: Editor ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#f0e8d0', letterSpacing: '-0.4px', margin: 0 }}>
            {selectedSection}
          </h2>
          <span style={{ fontSize: 12, color: saving ? '#c9943a' : 'rgba(240,232,208,0.3)', fontWeight: saving ? 600 : 400, transition: 'color 0.3s' }}>
            {saving ? '● Saving…' : '✓ Autosaved'}
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <button
            onClick={onReview}
            disabled={reviewing || !canReview}
            title={!canReview ? 'Write at least 20 characters first' : ''}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 10,
              background: reviewing
                ? 'rgba(201,148,58,0.15)'
                : !canReview
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg, #c9943a, #e8b84a)',
              color: reviewing || !canReview ? 'rgba(201,148,58,0.5)' : '#080c18',
              border: reviewing || !canReview ? '1px solid rgba(201,148,58,0.2)' : 'none',
              fontSize: 13, fontWeight: 700,
              cursor: reviewing || !canReview ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {reviewing ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>◌</span>
                Reviewing…
              </>
            ) : (
              <><span>✦</span> Review with AI</>
            )}
          </button>

          <button
            onClick={copyToClipboard}
            disabled={!content.trim()}
            title="Copy section to clipboard"
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 10,
              background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
              border: copied ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.08)',
              color: copied ? '#34d399' : !content.trim() ? 'rgba(240,232,208,0.2)' : 'rgba(240,232,208,0.6)',
              fontSize: 13, fontWeight: 500,
              cursor: !content.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span>{copied ? '✓' : '⎘'}</span> {copied ? 'Copied!' : 'Copy'}
          </button>

          {isAbstract && (
            <button
              onClick={suggestKeywords}
              disabled={keywordsLoading || !content.trim()}
              title="AI-suggest MeSH keywords from your abstract"
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 10,
                background: keywordsLoading ? 'rgba(99,179,237,0.08)' : 'rgba(99,179,237,0.06)',
                border: '1px solid rgba(99,179,237,0.2)',
                color: keywordsLoading || !content.trim() ? 'rgba(99,179,237,0.3)' : 'rgba(99,179,237,0.8)',
                fontSize: 13, fontWeight: 600,
                cursor: keywordsLoading || !content.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}
            >
              {keywordsLoading
                ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>◌</span> Suggesting…</>
                : <><span>🏷</span> Suggest Keywords</>
              }
            </button>
          )}
        </div>

        {/* Textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Write ${selectedSection.toLowerCase()} here…`}
          style={{
            width: '100%',
            height: 460,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 14,
            padding: '20px 24px',
            fontSize: 15,
            lineHeight: 1.75,
            color: '#f0e8d0',
            outline: 'none',
            resize: 'none',
            fontFamily: 'Inter, system-ui, sans-serif',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.35)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
        />

        {/* Word count */}
        <div style={{ marginTop: 10, padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: limit > 0 ? 6 : 0 }}>
            <span style={{ fontSize: 12, color: isOver ? '#f87171' : 'rgba(240,232,208,0.35)', fontWeight: isOver ? 600 : 400 }}>
              {count} {limit > 0 ? `/ ${limit} words` : 'words'}
            </span>
            {isOver && <span style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>{count - limit} over limit</span>}
            {limit > 0 && !isOver && count > 0 && <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.3)' }}>{limit - count} remaining</span>}
          </div>
          {limit > 0 && (
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: `${Math.min((count / limit) * 100, 100)}%`,
                background: isOver ? '#f87171' : count / limit > 0.8 ? '#f59e0b' : '#c9943a',
                transition: 'width 0.3s ease, background 0.3s ease',
              }} />
            </div>
          )}
        </div>

        {/* ── Keyword suggestions (Abstract only) ── */}
        {isAbstract && keywords.length > 0 && (
          <div style={{ marginTop: 16, padding: '16px 20px', borderRadius: 12, background: 'rgba(99,179,237,0.05)', border: '1px solid rgba(99,179,237,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(99,179,237,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>🏷 AI-Suggested Keywords</span>
                <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', marginLeft: 8 }}>MeSH-aligned · click to copy</span>
              </div>
              <button
                onClick={copyAllKeywords}
                style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, background: copiedKw === '__all__' ? 'rgba(52,211,153,0.1)' : 'rgba(99,179,237,0.08)', border: `1px solid ${copiedKw === '__all__' ? 'rgba(52,211,153,0.3)' : 'rgba(99,179,237,0.2)'}`, color: copiedKw === '__all__' ? '#34d399' : 'rgba(99,179,237,0.7)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
              >
                {copiedKw === '__all__' ? '✓ Copied all' : '⎘ Copy all'}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {keywords.map(kw => (
                <button
                  key={kw}
                  onClick={() => copyKeyword(kw)}
                  title="Click to copy"
                  style={{
                    padding: '5px 14px', borderRadius: 20, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                    background: copiedKw === kw ? 'rgba(52,211,153,0.12)' : 'rgba(99,179,237,0.08)',
                    border: `1px solid ${copiedKw === kw ? 'rgba(52,211,153,0.3)' : 'rgba(99,179,237,0.2)'}`,
                    color: copiedKw === kw ? '#34d399' : 'rgba(99,179,237,0.8)',
                    transition: 'all 0.15s',
                  }}
                >
                  {copiedKw === kw ? '✓ ' : ''}{kw}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Review Panel ── */}
      {(reviewData || reviewing) && (
      <div className="editor-review-panel" style={{
        width: 320,
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        <div
          ref={panelRef}
          style={{
            width: '100%',
            height: 560,
            overflowY: 'auto',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(201,148,58,0.18)',
            borderRadius: 16,
            padding: '20px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#c9943a' }}>✦</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f0e8d0', letterSpacing: '0.02em' }}>AI Review</span>
            </div>
            <button
              onClick={onCloseReview}
              style={{ background: 'none', border: 'none', color: 'rgba(240,232,208,0.3)', fontSize: 16, cursor: 'pointer', padding: '2px 6px', borderRadius: 6 }}
            >×</button>
          </div>

          {/* Loading state */}
          {reviewing && !reviewData && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 14, padding: '40px 0' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(201,148,58,0.15)', borderTopColor: '#c9943a', animation: 'spin 0.9s linear infinite' }}/>
              <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', textAlign: 'center', lineHeight: 1.6 }}>
                Analysing your {selectedSection.toLowerCase()}…
              </p>
            </div>
          )}

          {/* Results */}
          {reviewData && (
            <>
              {/* Score */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                <ScoreRing score={reviewData.score} />
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Section Score</div>
                  <div style={{ fontSize: 12, color: 'rgba(240,232,208,0.55)', lineHeight: 1.55 }}>{reviewData.summary}</div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }}/>

              {/* Issues */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(240,232,208,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>Feedback</p>
                {reviewData.issues.map((issue, i) => {
                  const cfg = ISSUE_CONFIG[issue.type]
                  return (
                    <div key={i} style={{
                      padding: '12px 14px', borderRadius: 10,
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 11, color: cfg.color, fontWeight: 800, flexShrink: 0 }}>{cfg.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f0e8d0' }}>{issue.title}</span>
                      </div>
                      <p style={{ fontSize: 11.5, color: 'rgba(240,232,208,0.5)', lineHeight: 1.6, margin: 0 }}>{issue.detail}</p>
                    </div>
                  )
                })}
              </div>

              {/* Re-review button */}
              <button
                onClick={onReview}
                disabled={reviewing}
                style={{
                  width: '100%', padding: '9px 0', borderRadius: 10, marginTop: 4,
                  background: 'rgba(201,148,58,0.08)', border: '1px solid rgba(201,148,58,0.2)',
                  color: '#c9943a', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,148,58,0.14)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201,148,58,0.08)')}
              >
                ↺ Re-review
              </button>
            </>
          )}
        </div>
      </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .editor-root { flex-direction: column !important; }
          .editor-review-panel { width: 100% !important; }
          .editor-review-panel > div { width: 100% !important; height: auto !important; max-height: 520px; }
        }
      `}</style>
    </div>
  )
}
