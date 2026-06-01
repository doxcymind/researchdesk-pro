'use client'

import { useRef, useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import { supabase } from '@/lib/supabase'

interface FlaggedPhrase {
  text: string
  reason: string
  severity: 'low' | 'medium' | 'high'
}

interface AnalysisResult {
  originality_score: number
  risk_level: 'low' | 'medium' | 'high'
  summary: string
  flagged_phrases: FlaggedPhrase[]
  strengths: string[]
  recommendations: string[]
}

interface PlagiarismPanelProps {
  projectId: number
}

const SEVERITY_BG:     Record<string, string> = { low: 'rgba(234,179,8,0.12)',   medium: 'rgba(249,115,22,0.12)',   high: 'rgba(239,68,68,0.12)'  }
const SEVERITY_BORDER: Record<string, string> = { low: 'rgba(234,179,8,0.35)',   medium: 'rgba(249,115,22,0.35)',   high: 'rgba(239,68,68,0.4)'   }
const SEVERITY_TEXT:   Record<string, string> = { low: '#fbbf24',                medium: '#fb923c',                  high: '#f87171'               }
const RISK_COLOR:      Record<string, string> = { low: '#4ade80',                medium: '#fbbf24',                  high: '#f87171'               }
const RISK_BG:         Record<string, string> = { low: 'rgba(74,222,128,0.12)', medium: 'rgba(251,191,36,0.12)',    high: 'rgba(248,113,113,0.12)' }
const RISK_BORDER:     Record<string, string> = { low: 'rgba(74,222,128,0.3)',  medium: 'rgba(251,191,36,0.3)',     high: 'rgba(248,113,113,0.3)'  }

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#f87171'
  const r = 44, C = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
      <svg width={110} height={110} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={55} cy={55} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={9} />
        <circle cx={55} cy={55} r={r} fill="none" stroke={color} strokeWidth={9}
          strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{score}%</span>
        <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.35)', marginTop: 2 }}>Original</span>
      </div>
    </div>
  )
}

type InputMode = 'file' | 'paste'
type ActiveTab = 'ai' | 'copyleaks'

export default function PlagiarismPanel({ projectId: _projectId }: PlagiarismPanelProps) {
  const [inputMode, setInputMode]       = useState<InputMode>('file')
  const [activeTab, setActiveTab]       = useState<ActiveTab>('ai')
  const [text, setText]                 = useState('')
  const [fileName, setFileName]         = useState<string | null>(null)
  const [extracting, setExtracting]     = useState(false)
  const [analysing, setAnalysing]       = useState(false)
  const [submittingCL, setSubmittingCL] = useState(false)
  const [result, setResult]             = useState<AnalysisResult | null>(null)
  const [copyleaksMsg, setCopyleaksMsg] = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [truncated, setTruncated]       = useState(false)
  const [dragOver, setDragOver]         = useState(false)
  const fileInputRef                    = useRef<HTMLInputElement>(null)

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  /* ─── file handling ─── */
  const processFile = async (file: File) => {
    setError(null)
    setResult(null)
    setCopyleaksMsg(null)
    setTruncated(false)

    const allowed = ['.pdf', '.docx', '.doc', '.txt']
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowed.includes(ext)) {
      setError('Unsupported file type. Please upload a PDF, DOCX, or TXT file.')
      return
    }

    setFileName(file.name)
    setExtracting(true)
    setText('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/plagiarism/extract', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setFileName(null); return }
      setText(data.text)
    } catch {
      setError('Failed to extract text from file. Please try again or paste the text manually.')
      setFileName(null)
    } finally {
      setExtracting(false)
    }
  }

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  /* ─── AI analysis ─── */
  const runAIAnalysis = async () => {
    if (!text.trim()) { setError('Please provide text to analyse — upload a file or paste your manuscript.'); return }
    setError(null); setResult(null)
    setAnalysing(true)
    try {
      const res = await apiFetch('/api/plagiarism', { method: 'POST', body: JSON.stringify({ text }) })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data.analysis)
      setTruncated(data.truncated || false)
    } catch {
      setError('Analysis failed. Please check your connection and try again.')
    } finally {
      setAnalysing(false)
    }
  }

  /* ─── Copyleaks ─── */
  const runCopyleaksScan = async () => {
    if (!text.trim()) { setError('Please provide text to scan — upload a file or paste your manuscript.'); return }
    setError(null); setCopyleaksMsg(null)
    setSubmittingCL(true)
    try {
      const res = await apiFetch('/api/plagiarism/copyleaks', { method: 'POST', body: JSON.stringify({ text }) })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setCopyleaksMsg(data.message || 'Scan submitted successfully.')
    } catch {
      setError('Copyleaks submission failed. Please try again.')
    } finally {
      setSubmittingCL(false)
    }
  }

  const hasText = text.trim().length > 0

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f0e8d0', margin: '0 0 6px' }}>Plagiarism Check</h2>
        <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.45)', margin: 0, lineHeight: 1.6 }}>
          Upload your manuscript file or paste text to check for originality. AI analysis runs instantly; Copyleaks cross-references global academic databases.
        </p>
      </div>

      {/* Input mode toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['file', 'paste'] as InputMode[]).map(mode => (
          <button key={mode} onClick={() => setInputMode(mode)} style={{
            padding: '7px 16px', borderRadius: 9, fontSize: 13, cursor: 'pointer',
            background: inputMode === mode ? 'rgba(201,148,58,0.15)' : 'rgba(255,255,255,0.04)',
            border: inputMode === mode ? '1px solid rgba(201,148,58,0.45)' : '1px solid rgba(255,255,255,0.08)',
            color: inputMode === mode ? '#e8b84a' : 'rgba(240,232,208,0.45)',
            fontWeight: inputMode === mode ? 600 : 400,
          }}>
            {mode === 'file' ? '📎 Upload File' : '✎ Paste Text'}
          </button>
        ))}
      </div>

      {/* ── FILE UPLOAD ── */}
      {inputMode === 'file' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            marginBottom: 20, padding: '36px 24px', borderRadius: 16, cursor: 'pointer',
            background: dragOver ? 'rgba(201,148,58,0.08)' : 'rgba(255,255,255,0.03)',
            border: `2px dashed ${dragOver ? 'rgba(201,148,58,0.6)' : 'rgba(255,255,255,0.12)'}`,
            textAlign: 'center', transition: 'all 0.2s',
          }}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" onChange={onFileInput} style={{ display: 'none' }} />
          {extracting ? (
            <div>
              <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
              <p style={{ fontSize: 14, color: 'rgba(240,232,208,0.5)', margin: 0 }}>Extracting text from file…</p>
            </div>
          ) : fileName && hasText ? (
            <div>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
              <p style={{ fontSize: 14, color: '#4ade80', margin: '0 0 4px', fontWeight: 600 }}>{fileName}</p>
              <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.4)', margin: 0 }}>{wordCount.toLocaleString()} words extracted · click to replace</p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
              <p style={{ fontSize: 15, color: 'rgba(240,232,208,0.7)', margin: '0 0 6px', fontWeight: 500 }}>
                Drop your manuscript here, or <span style={{ color: '#e8b84a' }}>browse</span>
              </p>
              <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.3)', margin: 0 }}>PDF, DOCX, DOC, TXT · max 10 MB</p>
            </div>
          )}
        </div>
      )}

      {/* ── PASTE TEXT ── */}
      {inputMode === 'paste' && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 11, color: 'rgba(240,232,208,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Manuscript Text</label>
            <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.3)' }}>{wordCount.toLocaleString()} words</span>
          </div>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setFileName(null) }}
            placeholder="Paste your abstract, introduction, methods, results, or full manuscript here…"
            rows={11}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: '14px 16px',
              color: '#f0e8d0', fontSize: 13, lineHeight: 1.7,
              resize: 'vertical', fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>
      )}

      {/* truncation notice */}
      {truncated && (
        <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', marginBottom: 12, marginTop: -8 }}>
          ⚠ Text was trimmed to 12,000 characters for AI analysis. Full text sent to Copyleaks.
        </p>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 16, padding: '11px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 18, lineHeight: 1, marginLeft: 12 }}>×</button>
        </div>
      )}

      {/* Analysis tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['ai', 'copyleaks'] as ActiveTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
            background: activeTab === tab ? 'rgba(201,148,58,0.15)' : 'rgba(255,255,255,0.04)',
            border: activeTab === tab ? '1px solid rgba(201,148,58,0.5)' : '1px solid rgba(255,255,255,0.08)',
            color: activeTab === tab ? '#e8b84a' : 'rgba(240,232,208,0.5)',
            fontWeight: activeTab === tab ? 600 : 400,
          }}>
            {tab === 'ai' ? '✦ AI Originality Analysis' : '🔎 Copyleaks Database Scan'}
          </button>
        ))}
      </div>

      {/* ── AI TAB ── */}
      {activeTab === 'ai' && (
        <>
          <button onClick={runAIAnalysis} disabled={analysing || !hasText} style={{
            padding: '11px 28px', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none',
            background: analysing || !hasText ? 'rgba(201,148,58,0.2)' : 'linear-gradient(135deg, #c9943a, #e8b84a)',
            color: analysing || !hasText ? 'rgba(8,12,24,0.4)' : '#080c18',
            cursor: analysing || !hasText ? 'not-allowed' : 'pointer', marginBottom: 28,
          }}>
            {analysing ? '⏳ Analysing…' : '✦ Run AI Originality Analysis'}
          </button>

          {result && (
            <div>
              {/* Score card */}
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 22, padding: '20px 24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }}>
                <ScoreRing score={result.originality_score} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: '#f0e8d0' }}>Originality Score</span>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: RISK_BG[result.risk_level], color: RISK_COLOR[result.risk_level], border: `1px solid ${RISK_BORDER[result.risk_level]}` }}>
                      {result.risk_level} risk
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.6)', margin: 0, lineHeight: 1.7 }}>{result.summary}</p>
                </div>
              </div>

              {/* Flagged phrases */}
              {result.flagged_phrases.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(240,232,208,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                    ⚑ Flagged Phrases ({result.flagged_phrases.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.flagged_phrases.map((p, i) => (
                      <div key={i} style={{ padding: '11px 14px', borderRadius: 10, background: SEVERITY_BG[p.severity], border: `1px solid ${SEVERITY_BORDER[p.severity]}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                          <span style={{ fontSize: 13, color: '#f0e8d0', fontStyle: 'italic', lineHeight: 1.5, flex: 1 }}>&ldquo;{p.text}&rdquo;</span>
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: SEVERITY_TEXT[p.severity], whiteSpace: 'nowrap', marginTop: 2 }}>{p.severity}</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.45)', margin: '5px 0 0', lineHeight: 1.5 }}>{p.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                {result.strengths.length > 0 && (
                  <div style={{ padding: '14px 16px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 12 }}>
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', margin: '0 0 9px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>✓ Strengths</h3>
                    <ul style={{ margin: 0, padding: '0 0 0 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {result.strengths.map((s, i) => <li key={i} style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', lineHeight: 1.6 }}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {result.recommendations.length > 0 && (
                  <div style={{ padding: '14px 16px', background: 'rgba(201,148,58,0.06)', border: '1px solid rgba(201,148,58,0.18)', borderRadius: 12 }}>
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: '#e8b84a', margin: '0 0 9px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>💡 Recommendations</h3>
                    <ul style={{ margin: 0, padding: '0 0 0 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {result.recommendations.map((r, i) => <li key={i} style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', lineHeight: 1.6 }}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.22)', lineHeight: 1.6 }}>
                ⓘ AI analysis is indicative only. For definitive cross-database plagiarism detection, use the Copyleaks tab.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── COPYLEAKS TAB ── */}
      {activeTab === 'copyleaks' && (
        <div>
          <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, marginBottom: 18 }}>
            <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.5)', margin: 0, lineHeight: 1.7 }}>
              Copyleaks cross-references your text against billions of internet pages, published journals, and submitted documents. Results appear in your Copyleaks dashboard within 1–3 minutes.
            </p>
          </div>

          {copyleaksMsg ? (
            <div style={{ padding: '16px 20px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.22)', borderRadius: 12, marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: '#4ade80', margin: '0 0 6px', fontWeight: 600 }}>✓ Scan Submitted</p>
              <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.6)', margin: '0 0 12px', lineHeight: 1.6 }}>{copyleaksMsg}</p>
              <a href="https://app.copyleaks.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#e8b84a', textDecoration: 'none', fontWeight: 500 }}>
                View results on Copyleaks Dashboard →
              </a>
            </div>
          ) : (
            <button onClick={runCopyleaksScan} disabled={submittingCL || !hasText} style={{
              padding: '11px 28px', borderRadius: 12, fontSize: 13, fontWeight: 600,
              background: submittingCL || !hasText ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
              color: submittingCL || !hasText ? 'rgba(240,232,208,0.25)' : '#f0e8d0',
              border: '1px solid rgba(255,255,255,0.1)', cursor: submittingCL || !hasText ? 'not-allowed' : 'pointer', marginBottom: 24,
            }}>
              {submittingCL ? '⏳ Submitting…' : '🔎 Submit to Copyleaks'}
            </button>
          )}

          <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.28)', lineHeight: 1.7 }}>
            <strong style={{ color: 'rgba(240,232,208,0.4)' }}>Setup:</strong> Create a free account at{' '}
            <a href="https://copyleaks.com" target="_blank" rel="noopener noreferrer" style={{ color: '#e8b84a', textDecoration: 'none' }}>copyleaks.com</a>
            , enable an API key, then add <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>COPYLEAKS_EMAIL</code> and{' '}
            <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>COPYLEAKS_KEY</code> to Vercel environment variables.
          </p>
        </div>
      )}
    </div>
  )
}
