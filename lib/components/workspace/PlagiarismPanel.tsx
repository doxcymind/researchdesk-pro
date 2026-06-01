'use client'

import { useRef, useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import { supabase } from '@/lib/supabase'

interface FlaggedPhrase {
  text: string; reason: string; severity: 'low' | 'medium' | 'high'
}
interface AnalysisResult {
  originality_score: number; risk_level: 'low' | 'medium' | 'high'
  summary: string; flagged_phrases: FlaggedPhrase[]
  strengths: string[]; recommendations: string[]
}
interface SourceMatch {
  phrase: string; probable_source: string; confidence: 'high' | 'medium' | 'low'; note: string
}
interface SourceResult {
  matches: SourceMatch[]; overall_assessment: string; estimated_similarity: number
}

const SBG:  Record<string, string> = { low: 'rgba(234,179,8,0.12)',   medium: 'rgba(249,115,22,0.12)',   high: 'rgba(239,68,68,0.12)'  }
const SBR:  Record<string, string> = { low: 'rgba(234,179,8,0.35)',   medium: 'rgba(249,115,22,0.35)',   high: 'rgba(239,68,68,0.4)'   }
const STX:  Record<string, string> = { low: '#fbbf24',                medium: '#fb923c',                  high: '#f87171'               }
const RCL:  Record<string, string> = { low: '#4ade80',                medium: '#fbbf24',                  high: '#f87171'               }
const RBG:  Record<string, string> = { low: 'rgba(74,222,128,0.12)', medium: 'rgba(251,191,36,0.12)',    high: 'rgba(248,113,113,0.12)' }
const RBR:  Record<string, string> = { low: 'rgba(74,222,128,0.3)',  medium: 'rgba(251,191,36,0.3)',     high: 'rgba(248,113,113,0.3)'  }
const CBG:  Record<string, string> = { high: 'rgba(239,68,68,0.1)',  medium: 'rgba(249,115,22,0.1)',     low: 'rgba(234,179,8,0.08)'   }
const CBR:  Record<string, string> = { high: 'rgba(239,68,68,0.3)',  medium: 'rgba(249,115,22,0.3)',     low: 'rgba(234,179,8,0.25)'   }
const CTX:  Record<string, string> = { high: '#f87171',              medium: '#fb923c',                  low: '#fbbf24'                }

function Ring({ score, label = 'Original' }: { score: number; label?: string }) {
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
        <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.35)', marginTop: 2 }}>{label}</span>
      </div>
    </div>
  )
}

type InputMode = 'file' | 'paste'

export default function PlagiarismPanel({ projectId: _pid }: { projectId: number }) {
  const [mode, setMode]       = useState<InputMode>('file')
  const [text, setText]       = useState('')
  const [fileName, setFN]     = useState<string | null>(null)
  const [extracting, setExt]  = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [truncated, setTrunc] = useState(false)
  const [dragOver, setDO]     = useState(false)
  const [ai, setAI]           = useState<AnalysisResult | null>(null)
  const [src, setSrc]         = useState<SourceResult | null>(null)
  const fileRef               = useRef<HTMLInputElement>(null)

  const wc      = text.trim() ? text.trim().split(/\s+/).length : 0
  const hasText = text.trim().length > 0

  const processFile = async (file: File) => {
    setError(null); setAI(null); setSrc(null)
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!['.pdf', '.docx', '.doc', '.txt'].includes(ext)) { setError('Please upload PDF, DOCX, or TXT.'); return }
    setFN(file.name); setExt(true); setText('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fd = new FormData(); fd.append('file', file)
      const res  = await fetch('/api/plagiarism/extract', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, body: fd })
      const data = await res.json()
      if (data.error) { setError(data.error); setFN(null); return }
      setText(data.text)
    } catch { setError('Failed to extract text. Try again or paste manually.'); setFN(null) }
    finally { setExt(false) }
  }

  const run = async () => {
    if (!hasText) { setError('Upload a file or paste text first.'); return }
    setError(null); setAI(null); setSrc(null); setTrunc(false); setRunning(true)

    const [r1, r2] = await Promise.allSettled([
      apiFetch('/api/plagiarism',         { method: 'POST', body: JSON.stringify({ text }) }).then(r => r.json()),
      apiFetch('/api/plagiarism/sources', { method: 'POST', body: JSON.stringify({ text }) }).then(r => r.json()),
    ])

    if (r1.status === 'fulfilled') {
      if (r1.value.error) setError(r1.value.error)
      else { setAI(r1.value.analysis); setTrunc(r1.value.truncated || false) }
    } else setError('AI analysis failed. Please try again.')

    if (r2.status === 'fulfilled' && !r2.value.error) setSrc(r2.value)

    setRunning(false)
  }

  const riskLabel = (r: string) => r.charAt(0).toUpperCase() + r.slice(1) + ' Risk'

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f0e8d0', margin: '0 0 6px' }}>Plagiarism Check</h2>
        <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.45)', margin: 0, lineHeight: 1.6 }}>
          Two parallel AI checks: originality analysis + known academic source detection. Results appear in seconds.
        </p>
      </div>

      {/* Input toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(['file', 'paste'] as InputMode[]).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: '7px 16px', borderRadius: 9, fontSize: 13, cursor: 'pointer',
            background: mode === m ? 'rgba(201,148,58,0.15)' : 'rgba(255,255,255,0.04)',
            border: mode === m ? '1px solid rgba(201,148,58,0.45)' : '1px solid rgba(255,255,255,0.08)',
            color: mode === m ? '#e8b84a' : 'rgba(240,232,208,0.45)', fontWeight: mode === m ? 600 : 400,
          }}>
            {m === 'file' ? '📎 Upload File' : '✎ Paste Text'}
          </button>
        ))}
      </div>

      {mode === 'file' && (
        <div onDragOver={e => { e.preventDefault(); setDO(true) }} onDragLeave={() => setDO(false)}
          onDrop={e => { e.preventDefault(); setDO(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f) }}
          onClick={() => fileRef.current?.click()}
          style={{ marginBottom: 20, padding: '36px 24px', borderRadius: 16, cursor: 'pointer', textAlign: 'center',
            background: dragOver ? 'rgba(201,148,58,0.08)' : 'rgba(255,255,255,0.03)',
            border: `2px dashed ${dragOver ? 'rgba(201,148,58,0.6)' : 'rgba(255,255,255,0.12)'}`, transition: 'all 0.2s' }}>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = '' }} style={{ display: 'none' }} />
          {extracting ? <><div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div><p style={{ fontSize: 14, color: 'rgba(240,232,208,0.5)', margin: 0 }}>Extracting text…</p></>
          : fileName && hasText ? <><div style={{ fontSize: 28, marginBottom: 8 }}>✓</div><p style={{ fontSize: 14, color: '#4ade80', margin: '0 0 4px', fontWeight: 600 }}>{fileName}</p><p style={{ fontSize: 12, color: 'rgba(240,232,208,0.4)', margin: 0 }}>{wc.toLocaleString()} words · click to replace</p></>
          : <><div style={{ fontSize: 32, marginBottom: 10 }}>📄</div><p style={{ fontSize: 15, color: 'rgba(240,232,208,0.7)', margin: '0 0 6px', fontWeight: 500 }}>Drop your manuscript here, or <span style={{ color: '#e8b84a' }}>browse</span></p><p style={{ fontSize: 12, color: 'rgba(240,232,208,0.3)', margin: 0 }}>PDF, DOCX, DOC, TXT · max 10 MB</p></>}
        </div>
      )}

      {mode === 'paste' && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 11, color: 'rgba(240,232,208,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Manuscript Text</label>
            <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.3)' }}>{wc.toLocaleString()} words</span>
          </div>
          <textarea value={text} onChange={e => { setText(e.target.value); setFN(null) }} placeholder="Paste your manuscript text here…" rows={11}
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px', color: '#f0e8d0', fontSize: 13, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', outline: 'none' }} />
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: '11px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 18, lineHeight: 1, marginLeft: 12 }}>×</button>
        </div>
      )}

      <button onClick={run} disabled={running || !hasText} style={{
        padding: '12px 32px', borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', marginBottom: 28,
        background: running || !hasText ? 'rgba(201,148,58,0.2)' : 'linear-gradient(135deg, #c9943a, #e8b84a)',
        color: running || !hasText ? 'rgba(8,12,24,0.4)' : '#080c18',
        cursor: running || !hasText ? 'not-allowed' : 'pointer',
      }}>
        {running ? '⏳ Analysing…' : '⚑ Check for Plagiarism'}
      </button>

      {truncated && <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', marginTop: -20, marginBottom: 20 }}>⚠ Text trimmed to 12,000 chars for analysis.</p>}

      {(ai || src) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* AI Originality */}
          {ai && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#e8b84a' }}>✦ Originality Analysis</span>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
                  <Ring score={ai.originality_score} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#f0e8d0' }}>Originality Score</span>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: RBG[ai.risk_level], color: RCL[ai.risk_level], border: `1px solid ${RBR[ai.risk_level]}` }}>
                        {riskLabel(ai.risk_level)}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.6)', margin: 0, lineHeight: 1.7 }}>{ai.summary}</p>
                  </div>
                </div>

                {ai.flagged_phrases.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,232,208,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>⚑ Flagged Phrases ({ai.flagged_phrases.length})</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {ai.flagged_phrases.map((p, i) => (
                        <div key={i} style={{ padding: '10px 14px', borderRadius: 9, background: SBG[p.severity], border: `1px solid ${SBR[p.severity]}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <span style={{ fontSize: 13, color: '#f0e8d0', fontStyle: 'italic', lineHeight: 1.5, flex: 1 }}>&ldquo;{p.text}&rdquo;</span>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: STX[p.severity], whiteSpace: 'nowrap', marginTop: 2 }}>{p.severity}</span>
                          </div>
                          <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.45)', margin: '4px 0 0', lineHeight: 1.5 }}>{p.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {ai.strengths.length > 0 && (
                    <div style={{ padding: '12px 14px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', margin: '0 0 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>✓ Strengths</p>
                      <ul style={{ margin: 0, padding: '0 0 0 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {ai.strengths.map((s, i) => <li key={i} style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', lineHeight: 1.6 }}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {ai.recommendations.length > 0 && (
                    <div style={{ padding: '12px 14px', background: 'rgba(201,148,58,0.06)', border: '1px solid rgba(201,148,58,0.18)', borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#e8b84a', margin: '0 0 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>💡 Recommendations</p>
                      <ul style={{ margin: 0, padding: '0 0 0 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {ai.recommendations.map((r, i) => <li key={i} style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', lineHeight: 1.6 }}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Known Sources */}
          {src && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(240,232,208,0.7)' }}>🔎 Known Source Detection</span>
                <span style={{ fontSize: 12, fontWeight: 700,
                  color: src.estimated_similarity <= 15 ? '#4ade80' : src.estimated_similarity <= 30 ? '#fbbf24' : '#f87171' }}>
                  ~{src.estimated_similarity}% from known sources
                </span>
              </div>
              <div style={{ padding: '20px' }}>
                <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.55)', margin: '0 0 16px', lineHeight: 1.7 }}>{src.overall_assessment}</p>

                {src.matches.length > 0 ? (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,232,208,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                      Identified Source Matches ({src.matches.length})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {src.matches.map((m, i) => (
                        <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: CBG[m.confidence] || CBG.medium, border: `1px solid ${CBR[m.confidence] || CBR.medium}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                            <span style={{ fontSize: 13, color: '#f0e8d0', fontStyle: 'italic', flex: 1, lineHeight: 1.5 }}>&ldquo;{m.phrase}&rdquo;</span>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: CTX[m.confidence] || CTX.medium, whiteSpace: 'nowrap' }}>{m.confidence}</span>
                          </div>
                          <p style={{ fontSize: 12, color: '#e8b84a', margin: '0 0 3px', fontWeight: 600 }}>📖 {m.probable_source}</p>
                          <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.4)', margin: 0, lineHeight: 1.5 }}>{m.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '14px 16px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 10 }}>
                    <p style={{ fontSize: 13, color: '#4ade80', margin: 0 }}>✓ No matches to known published sources detected.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.22)', lineHeight: 1.6 }}>
            ⓘ AI-based analysis. Results are indicative — always verify against your institution&apos;s plagiarism policy before submission.
          </p>
        </div>
      )}
    </div>
  )
}
