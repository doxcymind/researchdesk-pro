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

export default function PlagiarismPanel({ projectId: _projectId }: PlagiarismPanelProps) {
  const [inputMode, setInputMode]       = useState<InputMode>('file')
  const [text, setText]                 = useState('')
  const [fileName, setFileName]         = useState<string | null>(null)
  const [extracting, setExtracting]     = useState(false)
  const [running, setRunning]           = useState(false)
  const [aiResult, setAiResult]         = useState<AnalysisResult | null>(null)
  const [copyleaksMsg, setCopyleaksMsg] = useState<string | null>(null)
  const [copyleaksErr, setCopyleaksErr] = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [truncated, setTruncated]       = useState(false)
  const [dragOver, setDragOver]         = useState(false)
  const fileInputRef                    = useRef<HTMLInputElement>(null)

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const hasText   = text.trim().length > 0

  /* ── file handling ── */
  const processFile = async (file: File) => {
    setError(null); setAiResult(null); setCopyleaksMsg(null); setCopyleaksErr(null); setTruncated(false)
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!['.pdf', '.docx', '.doc', '.txt'].includes(ext)) {
      setError('Unsupported file type. Please upload a PDF, DOCX, or TXT file.')
      return
    }
    setFileName(file.name); setExtracting(true); setText('')
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
      setError('Failed to extract text from file. Try again or paste manually.')
      setFileName(null)
    } finally {
      setExtracting(false)
    }
  }

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) processFile(file); e.target.value = ''
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]; if (file) processFile(file)
  }

  /* ── run both checks ── */
  const runChecks = async () => {
    if (!hasText) { setError('Please upload a file or paste your manuscript text first.'); return }
    setError(null); setAiResult(null); setCopyleaksMsg(null); setCopyleaksErr(null)
    setRunning(true)

    // Run AI + Copyleaks in parallel
    const [aiRes, clRes] = await Promise.allSettled([
      apiFetch('/api/plagiarism',          { method: 'POST', body: JSON.stringify({ text }) }).then(r => r.json()),
      apiFetch('/api/plagiarism/copyleaks', { method: 'POST', body: JSON.stringify({ text }) }).then(r => r.json()),
    ])

    if (aiRes.status === 'fulfilled') {
      if (aiRes.value.error) setError(aiRes.value.error)
      else { setAiResult(aiRes.value.analysis); setTruncated(aiRes.value.truncated || false) }
    } else {
      setError('AI analysis failed. Please try again.')
    }

    if (clRes.status === 'fulfilled') {
      if (clRes.value.error) setCopyleaksErr(clRes.value.error)
      else setCopyleaksMsg(clRes.value.message || 'Scan submitted.')
    } else {
      setCopyleaksErr('Copyleaks submission failed.')
    }

    setRunning(false)
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f0e8d0', margin: '0 0 6px' }}>Plagiarism Check</h2>
        <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.45)', margin: 0, lineHeight: 1.6 }}>
          Upload your manuscript or paste text. We run AI originality analysis and Copyleaks database scan simultaneously.
        </p>
      </div>

      {/* Input mode toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
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

      {/* File drop zone */}
      {inputMode === 'file' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            marginBottom: 20, padding: '36px 24px', borderRadius: 16, cursor: 'pointer', textAlign: 'center',
            background: dragOver ? 'rgba(201,148,58,0.08)' : 'rgba(255,255,255,0.03)',
            border: `2px dashed ${dragOver ? 'rgba(201,148,58,0.6)' : 'rgba(255,255,255,0.12)'}`,
            transition: 'all 0.2s',
          }}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" onChange={onFileInput} style={{ display: 'none' }} />
          {extracting ? (
            <>
              <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
              <p style={{ fontSize: 14, color: 'rgba(240,232,208,0.5)', margin: 0 }}>Extracting text…</p>
            </>
          ) : fileName && hasText ? (
            <>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
              <p style={{ fontSize: 14, color: '#4ade80', margin: '0 0 4px', fontWeight: 600 }}>{fileName}</p>
              <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.4)', margin: 0 }}>{wordCount.toLocaleString()} words extracted · click to replace</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
              <p style={{ fontSize: 15, color: 'rgba(240,232,208,0.7)', margin: '0 0 6px', fontWeight: 500 }}>
                Drop your manuscript here, or <span style={{ color: '#e8b84a' }}>browse</span>
              </p>
              <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.3)', margin: 0 }}>PDF, DOCX, DOC, TXT · max 10 MB</p>
            </>
          )}
        </div>
      )}

      {/* Paste textarea */}
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

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 16, padding: '11px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 18, lineHeight: 1, marginLeft: 12 }}>×</button>
        </div>
      )}

      {/* Single CTA */}
      <button onClick={runChecks} disabled={running || !hasText} style={{
        padding: '12px 32px', borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none',
        background: running || !hasText ? 'rgba(201,148,58,0.2)' : 'linear-gradient(135deg, #c9943a, #e8b84a)',
        color: running || !hasText ? 'rgba(8,12,24,0.4)' : '#080c18',
        cursor: running || !hasText ? 'not-allowed' : 'pointer', marginBottom: 32,
      }}>
        {running ? '⏳ Running checks…' : '⚑ Check for Plagiarism'}
      </button>

      {truncated && (
        <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', marginTop: -24, marginBottom: 20 }}>
          ⚠ Text trimmed to 12,000 characters for AI analysis. Full text sent to Copyleaks.
        </p>
      )}

      {/* ── RESULTS ── */}
      {(aiResult || copyleaksMsg || copyleaksErr) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* AI Result */}
          {aiResult && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#e8b84a' }}>✦ AI Originality Analysis</span>
              </div>
              <div style={{ padding: '20px' }}>
                {/* Score row */}
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
                  <ScoreRing score={aiResult.originality_score} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#f0e8d0' }}>Originality Score</span>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: RISK_BG[aiResult.risk_level], color: RISK_COLOR[aiResult.risk_level], border: `1px solid ${RISK_BORDER[aiResult.risk_level]}` }}>
                        {aiResult.risk_level} risk
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.6)', margin: 0, lineHeight: 1.7 }}>{aiResult.summary}</p>
                  </div>
                </div>

                {/* Flagged phrases */}
                {aiResult.flagged_phrases.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,232,208,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
                      ⚑ Flagged Phrases ({aiResult.flagged_phrases.length})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {aiResult.flagged_phrases.map((p, i) => (
                        <div key={i} style={{ padding: '10px 14px', borderRadius: 9, background: SEVERITY_BG[p.severity], border: `1px solid ${SEVERITY_BORDER[p.severity]}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <span style={{ fontSize: 13, color: '#f0e8d0', fontStyle: 'italic', lineHeight: 1.5, flex: 1 }}>&ldquo;{p.text}&rdquo;</span>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: SEVERITY_TEXT[p.severity], whiteSpace: 'nowrap', marginTop: 2 }}>{p.severity}</span>
                          </div>
                          <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.45)', margin: '4px 0 0', lineHeight: 1.5 }}>{p.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {aiResult.strengths.length > 0 && (
                    <div style={{ padding: '12px 14px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', margin: '0 0 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>✓ Strengths</p>
                      <ul style={{ margin: 0, padding: '0 0 0 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {aiResult.strengths.map((s, i) => <li key={i} style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', lineHeight: 1.6 }}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {aiResult.recommendations.length > 0 && (
                    <div style={{ padding: '12px 14px', background: 'rgba(201,148,58,0.06)', border: '1px solid rgba(201,148,58,0.18)', borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#e8b84a', margin: '0 0 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>💡 Recommendations</p>
                      <ul style={{ margin: 0, padding: '0 0 0 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {aiResult.recommendations.map((r, i) => <li key={i} style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', lineHeight: 1.6 }}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Copyleaks Result */}
          {(copyleaksMsg || copyleaksErr) && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(240,232,208,0.7)' }}>🔎 Copyleaks Database Scan</span>
              </div>
              <div style={{ padding: '18px 20px' }}>
                {copyleaksMsg ? (
                  <>
                    <p style={{ fontSize: 14, color: '#4ade80', margin: '0 0 6px', fontWeight: 600 }}>✓ Scan Submitted</p>
                    <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.6)', margin: '0 0 14px', lineHeight: 1.6 }}>{copyleaksMsg}</p>
                    <a href="https://api.copyleaks.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#e8b84a', textDecoration: 'none', fontWeight: 500 }}>
                      View results on Copyleaks Dashboard →
                    </a>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: '#f87171', margin: '0 0 6px', fontWeight: 600 }}>⚠ Copyleaks unavailable</p>
                    <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.5)', margin: 0, lineHeight: 1.6 }}>{copyleaksErr}</p>
                    <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.3)', margin: '8px 0 0', lineHeight: 1.6 }}>
                      Add <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: 3 }}>COPYLEAKS_EMAIL</code> and <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: 3 }}>COPYLEAKS_KEY</code> to Vercel environment variables to enable this.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.22)', lineHeight: 1.6 }}>
            ⓘ AI analysis is indicative only. Copyleaks cross-references published academic literature for definitive detection.
          </p>
        </div>
      )}
    </div>
  )
}
