'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

interface ReviewIssue {
  type: 'error' | 'warning' | 'success'
  title: string
  detail: string
  question?: string
}

interface ReviewData {
  score: number
  summary: string
  mentor_note: string
  issues: ReviewIssue[]
}

interface EditorPanelProps {
  selectedSection: string
  content: string
  setContent: (value: string) => void
  saving: boolean
  reviewing: boolean
  reviewData: ReviewData | null
  onReview: () => void
  onCloseReview: () => void
  onSave?: () => void
  onKeywordsGenerated?: (keywords: string[]) => void
}

const WORD_LIMITS: Record<string, number> = {
  Abstract: 250, Introduction: 500, Methods: 600,
  Results: 600, Discussion: 800, References: 0,
}

const SECTION_GUIDANCE: Record<string, { what: string; structure: string[]; tip: string }> = {
  Abstract: {
    what: 'A concise summary of your entire study — the first thing editors and reviewers read.',
    structure: ['Background — Why was this study needed?', 'Objective — What did you aim to find?', 'Methods — How did you do it? (study design, setting, participants)', 'Results — What did you find? (include key numbers)', 'Conclusion — What does it mean clinically?'],
    tip: 'Write the Abstract last. It\'s easier once the full manuscript is done.',
  },
  Introduction: {
    what: 'Sets the context and justifies why your study was necessary.',
    structure: ['Start broad — the global/national burden of the problem', 'Narrow down — what is known about this specific topic', 'Identify the gap — what is NOT known or NOT done', 'Your study — how you address that gap and your objective'],
    tip: 'Think of it as a funnel — broad at the top, narrow at the bottom ending with your aim.',
  },
  Methods: {
    what: 'Describes exactly how you conducted the study — detailed enough for another researcher to replicate.',
    structure: ['Study design & setting (RCT, cohort, etc. — where & when)', 'Participants (inclusion/exclusion criteria, how recruited)', 'Intervention or exposure (what was done to/by participants)', 'Outcome measures (what you measured and how)', 'Statistical analysis (software, tests used, significance level)', 'Ethics approval (IRB/ethics committee reference number)'],
    tip: 'Imagine someone trying to repeat your study exactly. Have you given them everything they need?',
  },
  Results: {
    what: 'Presents your findings — numbers, data, statistics. No interpretation here.',
    structure: ['Participant flow (how many enrolled, excluded, completed)', 'Baseline characteristics (Table 1 — demographics)', 'Primary outcome (your main finding with statistics)', 'Secondary outcomes (additional findings)', 'Any adverse events or unexpected findings'],
    tip: 'Results section = data only. Save your interpretation for the Discussion.',
  },
  Discussion: {
    what: 'Interprets your results in the context of existing literature.',
    structure: ['Open with your key finding (one sentence)', 'Compare with previous studies — agree or disagree?', 'Explain WHY your results are what they are', 'Acknowledge limitations (every study has them — be honest)', 'Clinical/research implications — what does this mean in practice?'],
    tip: 'The Discussion is where you show your depth of understanding. Don\'t just repeat the Results.',
  },
  Conclusion: {
    what: 'A brief, punchy summary of what your study proved and what should happen next.',
    structure: ['Restate your key finding (no new data)', 'Clinical implication — what should practitioners do?', 'Research implication — what should future studies do?'],
    tip: 'Keep it to 3-5 sentences. If it\'s longer, it\'s not a conclusion — it\'s another Discussion.',
  },
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
  const label = score >= 75 ? 'Good' : score >= 50 ? 'Developing' : 'Needs Work'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 44 44)" style={{ transition: 'stroke-dasharray 0.8s ease' }}/>
        <text x="44" y="47" textAnchor="middle" fill={color} fontSize="16" fontWeight="800">{score}</text>
        <text x="44" y="60" textAnchor="middle" fill="rgba(240,232,208,0.3)" fontSize="8">/100</text>
      </svg>
      <span style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: '0.06em' }}>{label}</span>
    </div>
  )
}

export default function EditorPanel({
  selectedSection, content, setContent, saving,
  reviewing, reviewData, onReview, onCloseReview, onSave, onKeywordsGenerated,
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
  const guidance = SECTION_GUIDANCE[selectedSection]
  const isEmpty = content.trim().length < 10

  const suggestKeywords = async () => {
    if (!content.trim() || keywordsLoading) return
    setKeywordsLoading(true)
    setKeywords([])
    try {
      const { apiFetch } = await import('@/lib/api-fetch')
      const res = await apiFetch('/api/keywords', { method: 'POST', body: JSON.stringify({ abstract: content }) })
      const data = await res.json()
      if (data.keywords) {
        setKeywords(data.keywords)
        onKeywordsGenerated?.(data.keywords)
      }
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); onSave?.() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSave])

  useEffect(() => {
    if (reviewData && panelRef.current) panelRef.current.scrollTop = 0
  }, [reviewData])

  const canReview = content.trim().length >= 20

  return (
    <div className="editor-root" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

      {/* ── Left: Editor ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#f0e8d0', letterSpacing: '-0.4px', margin: 0 }}>
            {selectedSection}
          </h2>
          <span style={{ fontSize: 12, color: saving ? '#c9943a' : 'rgba(240,232,208,0.3)', fontWeight: saving ? 600 : 400, transition: 'color 0.3s' }}>
            {saving ? '● Saving…' : '✓ Autosaved'}
          </span>
        </div>

        {/* Section guidance — shown when empty */}
        {isEmpty && guidance && (
          <div style={{
            marginBottom: 16, padding: '18px 20px', borderRadius: 14,
            background: 'rgba(201,148,58,0.05)', border: '1px solid rgba(201,148,58,0.18)',
            animation: 'fadeIn 0.4s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: '#c9943a' }}>✦</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#c9943a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Mentor Guidance — {selectedSection}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.6)', marginBottom: 12, lineHeight: 1.6 }}>
              {guidance.what}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {guidance.structure.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, color: '#c9943a', fontWeight: 700, marginTop: 3, flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ fontSize: 12.5, color: 'rgba(240,232,208,0.55)', lineHeight: 1.55 }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(201,148,58,0.08)', border: '1px solid rgba(201,148,58,0.15)' }}>
              <span style={{ fontSize: 11, color: 'rgba(201,148,58,0.8)' }}>💡 <strong>Tip:</strong> {guidance.tip}</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <button
            onClick={onReview}
            disabled={reviewing || !canReview}
            title={!canReview ? 'Write at least 20 characters first' : 'Get mentor feedback on what you\'ve written'}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 10,
              background: reviewing ? 'rgba(201,148,58,0.15)' : !canReview ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #c9943a, #e8b84a)',
              color: reviewing || !canReview ? 'rgba(201,148,58,0.5)' : '#080c18',
              border: reviewing || !canReview ? '1px solid rgba(201,148,58,0.2)' : 'none',
              fontSize: 13, fontWeight: 700,
              cursor: reviewing || !canReview ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {reviewing ? (
              <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>◌</span> Mentor is reading…</>
            ) : (
              <><span>✦</span> Get Mentor Feedback</>
            )}
          </button>

          <button onClick={copyToClipboard} disabled={!content.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 10,
              background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
              border: copied ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.08)',
              color: copied ? '#34d399' : !content.trim() ? 'rgba(240,232,208,0.2)' : 'rgba(240,232,208,0.6)',
              fontSize: 13, fontWeight: 500, cursor: !content.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            }}>
            <span>{copied ? '✓' : '⎘'}</span> {copied ? 'Copied!' : 'Copy'}
          </button>

          {isAbstract && (
            <button onClick={suggestKeywords} disabled={keywordsLoading || !content.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 10,
                background: 'rgba(99,179,237,0.06)', border: '1px solid rgba(99,179,237,0.2)',
                color: keywordsLoading || !content.trim() ? 'rgba(99,179,237,0.3)' : 'rgba(99,179,237,0.8)',
                fontSize: 13, fontWeight: 600, cursor: keywordsLoading || !content.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}>
              {keywordsLoading
                ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>◌</span> Suggesting…</>
                : <><span>🏷</span> Suggest Keywords</>}
            </button>
          )}
        </div>

        {/* Textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={guidance ? `Start writing your ${selectedSection.toLowerCase()} here…\n\nYour AI mentor will review what you write and guide you to improve it.` : `Write ${selectedSection.toLowerCase()} here…`}
          className="editor-textarea"
          style={{
            width: '100%', height: 460,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 14, padding: '20px 24px', fontSize: 15,
            lineHeight: 1.75, color: '#f0e8d0', outline: 'none', resize: 'none',
            fontFamily: 'Inter, system-ui, sans-serif', transition: 'border-color 0.2s',
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

        {/* Keyword suggestions */}
        {isAbstract && keywords.length > 0 && (
          <div style={{ marginTop: 16, padding: '16px 20px', borderRadius: 12, background: 'rgba(99,179,237,0.05)', border: '1px solid rgba(99,179,237,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(99,179,237,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>🏷 AI-Suggested Keywords</span>
                <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', marginLeft: 8 }}>MeSH-aligned · click to copy</span>
              </div>
              <button onClick={copyAllKeywords}
                style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, background: copiedKw === '__all__' ? 'rgba(52,211,153,0.1)' : 'rgba(99,179,237,0.08)', border: `1px solid ${copiedKw === '__all__' ? 'rgba(52,211,153,0.3)' : 'rgba(99,179,237,0.2)'}`, color: copiedKw === '__all__' ? '#34d399' : 'rgba(99,179,237,0.7)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                {copiedKw === '__all__' ? '✓ Copied all' : '⎘ Copy all'}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {keywords.map(kw => (
                <button key={kw} onClick={() => copyKeyword(kw)}
                  style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', background: copiedKw === kw ? 'rgba(52,211,153,0.12)' : 'rgba(99,179,237,0.08)', border: `1px solid ${copiedKw === kw ? 'rgba(52,211,153,0.3)' : 'rgba(99,179,237,0.2)'}`, color: copiedKw === kw ? '#34d399' : 'rgba(99,179,237,0.8)', transition: 'all 0.15s' }}>
                  {copiedKw === kw ? '✓ ' : ''}{kw}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Mentor Feedback Panel ── */}
      {(reviewData || reviewing) && (
        <div className="editor-review-panel" style={{ width: 340, flexShrink: 0 }}>
          <div ref={panelRef} style={{
            width: '100%', maxHeight: 620, overflowY: 'auto',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(201,148,58,0.2)',
            borderRadius: 18, padding: '20px 18px',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>

            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: '#c9943a' }}>✦</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f0e8d0', letterSpacing: '0.02em' }}>Mentor Feedback</span>
              </div>
              <button onClick={onCloseReview}
                style={{ background: 'none', border: 'none', color: 'rgba(240,232,208,0.3)', fontSize: 18, cursor: 'pointer', padding: '2px 6px', borderRadius: 6 }}>×</button>
            </div>

            {/* Loading */}
            {reviewing && !reviewData && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 14, padding: '40px 0' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(201,148,58,0.15)', borderTopColor: '#c9943a', animation: 'spin 0.9s linear infinite' }}/>
                <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', textAlign: 'center', lineHeight: 1.6 }}>
                  Your mentor is reading your {selectedSection.toLowerCase()}…
                </p>
              </div>
            )}

            {/* Results */}
            {reviewData && (
              <>
                {/* Score + summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <ScoreRing score={reviewData.score} />
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Section Score</div>
                    <div style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', lineHeight: 1.55 }}>{reviewData.summary}</div>
                  </div>
                </div>

                {/* Mentor note */}
                {reviewData.mentor_note && (
                  <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(201,148,58,0.06)', border: '1px solid rgba(201,148,58,0.18)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(201,148,58,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>✦ Mentor Note</div>
                    <p style={{ fontSize: 12.5, color: 'rgba(240,232,208,0.65)', lineHeight: 1.65, margin: 0 }}>{reviewData.mentor_note}</p>
                  </div>
                )}

                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }}/>

                {/* Issues */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(240,232,208,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>Detailed Feedback</p>
                  {reviewData.issues.map((issue, i) => {
                    const cfg = ISSUE_CONFIG[issue.type]
                    return (
                      <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: cfg.color, fontWeight: 800, flexShrink: 0 }}>{cfg.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#f0e8d0' }}>{issue.title}</span>
                        </div>
                        <p style={{ fontSize: 11.5, color: 'rgba(240,232,208,0.55)', lineHeight: 1.65, margin: 0 }}>{issue.detail}</p>
                        {issue.question && (
                          <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.45)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>🤔 {issue.question}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Re-review */}
                <button onClick={onReview} disabled={reviewing}
                  style={{ width: '100%', padding: '9px 0', borderRadius: 10, marginTop: 4, background: 'rgba(201,148,58,0.08)', border: '1px solid rgba(201,148,58,0.2)', color: '#c9943a', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,148,58,0.14)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201,148,58,0.08)')}>
                  ↺ Re-read my revision
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .editor-root { flex-direction: column !important; }
          .editor-review-panel { width: 100% !important; }
          .editor-review-panel > div { width: 100% !important; height: auto !important; max-height: 520px; }
        }
      `}</style>
    </div>
  )
}
