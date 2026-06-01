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

/* ── colour helpers ── */
const riskColor  = (r: string) => r === 'low' ? '#4ade80' : r === 'medium' ? '#fbbf24' : '#f87171'
const riskBg     = (r: string) => r === 'low' ? 'rgba(74,222,128,0.10)' : r === 'medium' ? 'rgba(251,191,36,0.10)' : 'rgba(248,113,113,0.10)'
const riskBorder = (r: string) => r === 'low' ? 'rgba(74,222,128,0.30)' : r === 'medium' ? 'rgba(251,191,36,0.30)' : 'rgba(248,113,113,0.30)'
const confColor  = (c: string) => c === 'high' ? '#f87171' : c === 'medium' ? '#fb923c' : '#fbbf24'
const confBg     = (c: string) => c === 'high' ? 'rgba(239,68,68,0.10)' : c === 'medium' ? 'rgba(249,115,22,0.10)' : 'rgba(234,179,8,0.08)'
const sevHl      = (s: string) => s === 'high' ? 'rgba(239,68,68,0.22)' : s === 'medium' ? 'rgba(249,115,22,0.18)' : 'rgba(234,179,8,0.14)'

/* ── big score donut ── */
function Donut({ score, label, size = 130 }: { score: number; label: string; size?: number }) {
  const r = (size / 2) - 10
  const C = 2 * Math.PI * r
  const color = score >= 75 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#f87171'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.2, fontWeight: 800, color, lineHeight: 1 }}>{score}%</span>
        <span style={{ fontSize: size * 0.09, color: 'rgba(240,232,208,0.35)', marginTop: 2, textAlign: 'center', maxWidth: size * 0.7 }}>{label}</span>
      </div>
    </div>
  )
}

/* ── highlighted text view ── */
function HighlightedText({ text, phrases }: { text: string; phrases: FlaggedPhrase[] }) {
  if (!phrases.length) return (
    <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.55)', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
      {text.slice(0, 2000)}{text.length > 2000 ? '…' : ''}
    </p>
  )

  // build highlighted segments
  const preview = text.slice(0, 3000)
  let result: { chunk: string; severity?: string }[] = [{ chunk: preview }]

  for (const p of phrases) {
    const needle = p.text.slice(0, 80)
    const next: typeof result = []
    for (const seg of result) {
      if (seg.severity) { next.push(seg); continue }
      const idx = seg.chunk.toLowerCase().indexOf(needle.toLowerCase())
      if (idx === -1) { next.push(seg); continue }
      if (idx > 0) next.push({ chunk: seg.chunk.slice(0, idx) })
      next.push({ chunk: seg.chunk.slice(idx, idx + needle.length), severity: p.severity })
      if (idx + needle.length < seg.chunk.length) next.push({ chunk: seg.chunk.slice(idx + needle.length) })
    }
    result = next
  }

  return (
    <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.65)', lineHeight: 1.9, margin: 0, whiteSpace: 'pre-wrap' }}>
      {result.map((seg, i) =>
        seg.severity
          ? <mark key={i} title={phrases.find(p => p.text.slice(0, 80).toLowerCase() === seg.chunk.toLowerCase())?.reason}
              style={{ background: sevHl(seg.severity), color: '#f0e8d0', borderRadius: 3, padding: '0 2px', cursor: 'help' }}>
              {seg.chunk}
            </mark>
          : <span key={i}>{seg.chunk}</span>
      )}
      {text.length > 3000 && <span style={{ color: 'rgba(240,232,208,0.3)' }}> …[truncated for display]</span>}
    </p>
  )
}

type InputMode = 'file' | 'paste'
type View = 'input' | 'results'

export default function PlagiarismPanel({ projectId: _pid }: { projectId: number }) {
  const [mode, setMode]       = useState<InputMode>('file')
  const [view, setView]       = useState<View>('input')
  const [text, setText]       = useState('')
  const [fileName, setFN]     = useState<string | null>(null)
  const [extracting, setExt]  = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [truncated, setTrunc] = useState(false)
  const [dragOver, setDO]     = useState(false)
  const [ai, setAI]           = useState<AnalysisResult | null>(null)
  const [src, setSrc]         = useState<SourceResult | null>(null)
  const [activeMatch, setAM]  = useState<number | null>(null)
  const [showText, setShowTx] = useState(false)
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
    setError(null); setAI(null); setSrc(null); setTrunc(false); setRunning(true); setView('input')

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
    if (r1.status === 'fulfilled' && !r1.value.error) setView('results')
  }

  const reset = () => { setView('input'); setAI(null); setSrc(null); setError(null); setText(''); setFN(null); setTrunc(false); setAM(null); setShowTx(false) }

  const downloadReport = () => {
    if (!ai) return
    const lines: string[] = [
      '═══════════════════════════════════════════════════════',
      '             PLAGIARISM CHECK REPORT',
      '             ResearchDesk Pro',
      `             Generated: ${new Date().toLocaleString()}`,
      '═══════════════════════════════════════════════════════',
      '',
      `Document: ${fileName ?? 'Pasted text'}`,
      `Words Analysed: ${wc.toLocaleString()}`,
      '',
      '─── ORIGINALITY SCORE ─────────────────────────────────',
      `Score: ${ai.originality_score}% Original`,
      `Risk Level: ${ai.risk_level.toUpperCase()}`,
      '',
      ai.summary,
      '',
    ]
    if (ai.flagged_phrases.length) {
      lines.push('─── FLAGGED PHRASES ────────────────────────────────────')
      ai.flagged_phrases.forEach((p, i) => {
        lines.push(`${i + 1}. [${p.severity.toUpperCase()}] "${p.text}"`)
        lines.push(`   → ${p.reason}`)
        lines.push('')
      })
    }
    if (src) {
      lines.push('─── KNOWN SOURCE DETECTION ─────────────────────────────')
      lines.push(`Estimated from known sources: ~${src.estimated_similarity}%`)
      lines.push(src.overall_assessment)
      lines.push('')
      if (src.matches.length) {
        src.matches.forEach((m, i) => {
          lines.push(`${i + 1}. [${m.confidence.toUpperCase()} CONFIDENCE]`)
          lines.push(`   Phrase: "${m.phrase}"`)
          lines.push(`   Source: ${m.probable_source}`)
          lines.push(`   Note: ${m.note}`)
          lines.push('')
        })
      }
    }
    lines.push('─── DISCLAIMER ─────────────────────────────────────────')
    lines.push('AI-based analysis. Results are indicative — always verify')
    lines.push("against your institution's plagiarism policy before submission.")
    lines.push('═══════════════════════════════════════════════════════')

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = `plagiarism-report-${Date.now()}.txt`
    a.click(); URL.revokeObjectURL(url)
  }

  /* ────────────────── INPUT SCREEN ────────────────── */
  if (view === 'input' || !ai) return (
    <div style={{ maxWidth: 740, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#c9943a,#e8b84a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚑</div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f0e8d0', margin: 0, letterSpacing: '-0.01em' }}>Plagiarism Check</h2>
            <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0 }}>AI-powered originality analysis · no external uploads required</p>
          </div>
        </div>
      </div>

      {/* Input mode toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 11, width: 'fit-content' }}>
        {(['file', 'paste'] as InputMode[]).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: '7px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
            background: mode === m ? 'rgba(201,148,58,0.2)' : 'transparent',
            color: mode === m ? '#e8b84a' : 'rgba(240,232,208,0.4)', fontWeight: mode === m ? 700 : 400,
            boxShadow: mode === m ? '0 0 0 1px rgba(201,148,58,0.4)' : 'none',
          }}>
            {m === 'file' ? '📎 Upload File' : '✎ Paste Text'}
          </button>
        ))}
      </div>

      {/* File drop zone */}
      {mode === 'file' && (
        <div onDragOver={e => { e.preventDefault(); setDO(true) }} onDragLeave={() => setDO(false)}
          onDrop={e => { e.preventDefault(); setDO(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f) }}
          onClick={() => fileRef.current?.click()}
          style={{ marginBottom: 20, padding: '44px 24px', borderRadius: 18, cursor: 'pointer', textAlign: 'center',
            background: dragOver ? 'rgba(201,148,58,0.07)' : 'rgba(255,255,255,0.025)',
            border: `2px dashed ${dragOver ? 'rgba(201,148,58,0.55)' : 'rgba(255,255,255,0.10)'}`, transition: 'all 0.2s' }}>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = '' }} style={{ display: 'none' }} />
          {extracting
            ? <><div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div><p style={{ fontSize: 14, color: 'rgba(240,232,208,0.5)', margin: 0 }}>Extracting text…</p></>
            : fileName && hasText
            ? <>
                <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24 }}>✓</div>
                <p style={{ fontSize: 15, color: '#4ade80', margin: '0 0 5px', fontWeight: 700 }}>{fileName}</p>
                <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0 }}>{wc.toLocaleString()} words extracted · click to replace</p>
              </>
            : <>
                <div style={{ fontSize: 38, marginBottom: 12 }}>📄</div>
                <p style={{ fontSize: 15, color: 'rgba(240,232,208,0.65)', margin: '0 0 6px', fontWeight: 600 }}>
                  Drop your manuscript here, or <span style={{ color: '#e8b84a', textDecoration: 'underline' }}>browse</span>
                </p>
                <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.28)', margin: 0 }}>PDF · DOCX · DOC · TXT &nbsp;·&nbsp; max 10 MB</p>
              </>
          }
        </div>
      )}

      {/* Paste area */}
      {mode === 'paste' && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
            <label style={{ fontSize: 11, color: 'rgba(240,232,208,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Manuscript Text</label>
            <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.28)' }}>{wc.toLocaleString()} words</span>
          </div>
          <textarea value={text} onChange={e => { setText(e.target.value); setFN(null) }}
            placeholder="Paste your manuscript text here…" rows={12}
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 14, padding: '14px 16px', color: '#f0e8d0', fontSize: 13, lineHeight: 1.8, resize: 'vertical', fontFamily: 'inherit', outline: 'none' }} />
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: '11px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 18, lineHeight: 1, marginLeft: 12 }}>×</button>
        </div>
      )}

      {/* Check button */}
      <button onClick={run} disabled={running || !hasText} style={{
        padding: '13px 36px', borderRadius: 13, fontSize: 15, fontWeight: 800, border: 'none', cursor: running || !hasText ? 'not-allowed' : 'pointer',
        background: running || !hasText ? 'rgba(201,148,58,0.18)' : 'linear-gradient(135deg, #c9943a 0%, #e8b84a 100%)',
        color: running || !hasText ? 'rgba(240,232,208,0.3)' : '#080c18',
        boxShadow: running || !hasText ? 'none' : '0 4px 20px rgba(201,148,58,0.35)',
        transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {running
          ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 16 }}>⏳</span> Analysing…</>
          : <><span>⚑</span> Check for Plagiarism</>
        }
      </button>
      {running && (
        <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.3)', marginTop: 10 }}>
          Running dual AI analysis — usually takes 10–20 seconds…
        </p>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  /* ────────────────── RESULTS SCREEN ────────────────── */
  const overallSimilarity = src?.estimated_similarity ?? (100 - (ai?.originality_score ?? 100))
  const simColor = overallSimilarity <= 15 ? '#4ade80' : overallSimilarity <= 30 ? '#fbbf24' : '#f87171'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ── Report header bar ── */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#c9943a,#e8b84a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>⚑</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#f0e8d0', marginBottom: 2 }}>Plagiarism Report</div>
            <div style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)' }}>
              {fileName ?? 'Pasted text'} &nbsp;·&nbsp; {wc.toLocaleString()} words &nbsp;·&nbsp; {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={downloadReport} style={{
            padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: 'rgba(201,148,58,0.12)', border: '1px solid rgba(201,148,58,0.3)', color: '#e8b84a',
          }}>⬇ Download Report</button>
          <button onClick={reset} style={{
            padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(240,232,208,0.5)',
          }}>↩ New Check</button>
        </div>
      </div>

      {/* ── Score summary row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {/* Originality score */}
        <div style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${riskBorder(ai.risk_level)}`, borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Donut score={ai.originality_score} label="Original" size={110} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(240,232,208,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Originality</div>
            <div style={{ display: 'inline-block', marginTop: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: riskBg(ai.risk_level), color: riskColor(ai.risk_level), border: `1px solid ${riskBorder(ai.risk_level)}` }}>
              {ai.risk_level.toUpperCase()} RISK
            </div>
          </div>
        </div>

        {/* Similarity score */}
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Donut score={overallSimilarity} label="Similarity" size={110} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(240,232,208,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>From Known Sources</div>
            <div style={{ marginTop: 4, fontSize: 12, color: simColor, fontWeight: 600 }}>
              {overallSimilarity <= 15 ? 'Within acceptable range' : overallSimilarity <= 30 ? 'Moderate — review flagged' : 'High — action needed'}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,232,208,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Analysis Summary</div>
          {[
            ['Words Analysed',   wc.toLocaleString()],
            ['Flagged Phrases',  String(ai.flagged_phrases.length)],
            ['Source Matches',   String(src?.matches.length ?? 0)],
            ['AI Checks Run',    '2'],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.45)' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f0e8d0' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Summary ── */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.6)', margin: 0, lineHeight: 1.8 }}>
          <span style={{ color: '#e8b84a', fontWeight: 700 }}>Summary: </span>{ai.summary}
        </p>
        {src?.overall_assessment && (
          <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.5)', margin: '10px 0 0', lineHeight: 1.8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
            <span style={{ color: 'rgba(240,232,208,0.4)', fontWeight: 700 }}>Source detection: </span>{src.overall_assessment}
          </p>
        )}
        {truncated && <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.25)', margin: '8px 0 0' }}>⚠ Text was trimmed to 12,000 characters for AI analysis.</p>}
      </div>

      {/* ── Highlighted document ── */}
      {ai.flagged_phrases.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
          <button onClick={() => setShowTx(v => !v)} style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(240,232,208,0.7)' }}>📄 Annotated Document View</span>
            <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)' }}>{showText ? '▲ Hide' : '▼ Show'} · flagged phrases highlighted inline</span>
          </button>
          {showText && (
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', gap: 10, margin: '12px 0', flexWrap: 'wrap' }}>
                {[['high','#f87171','rgba(239,68,68,0.22)'],['medium','#fb923c','rgba(249,115,22,0.18)'],['low','#fbbf24','rgba(234,179,8,0.14)']].map(([sev,col,bg]) => (
                  <span key={sev} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: bg as string, color: col, fontWeight: 600 }}>
                    ● {sev.charAt(0).toUpperCase()+sev.slice(1)} risk
                  </span>
                ))}
                <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', alignSelf: 'center' }}>Hover highlighted text for details</span>
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 4 }}>
                <HighlightedText text={text} phrases={ai.flagged_phrases} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Two column: Flagged phrases + Source matches ── */}
      <div style={{ display: 'grid', gridTemplateColumns: ai.flagged_phrases.length && src?.matches.length ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 20 }}>

        {/* Flagged phrases */}
        {ai.flagged_phrases.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f0e8d0' }}>⚑ Flagged Phrases</span>
              <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.35)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 20 }}>{ai.flagged_phrases.length}</span>
            </div>
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ai.flagged_phrases.map((p, i) => (
                <div key={i} style={{ padding: '10px 12px', borderRadius: 10,
                  background: p.severity === 'high' ? 'rgba(239,68,68,0.08)' : p.severity === 'medium' ? 'rgba(249,115,22,0.08)' : 'rgba(234,179,8,0.06)',
                  border: `1px solid ${p.severity === 'high' ? 'rgba(239,68,68,0.25)' : p.severity === 'medium' ? 'rgba(249,115,22,0.25)' : 'rgba(234,179,8,0.2)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#f0e8d0', fontStyle: 'italic', flex: 1, lineHeight: 1.5 }}>&ldquo;{p.text}&rdquo;</span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: p.severity === 'high' ? '#f87171' : p.severity === 'medium' ? '#fb923c' : '#fbbf24', whiteSpace: 'nowrap' }}>{p.severity}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.4)', margin: 0, lineHeight: 1.5 }}>{p.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source matches */}
        {src && (src.matches.length > 0 || true) && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f0e8d0' }}>🔎 Source Matches</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: simColor }}>~{src.estimated_similarity}%</span>
            </div>
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {src.matches.length === 0
                ? <div style={{ padding: '14px 12px', background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10 }}>
                    <p style={{ fontSize: 13, color: '#4ade80', margin: 0 }}>✓ No matches to known published sources detected.</p>
                  </div>
                : src.matches.map((m, i) => (
                    <div key={i} onMouseEnter={() => setAM(i)} onMouseLeave={() => setAM(null)}
                      style={{ padding: '10px 12px', borderRadius: 10, cursor: 'default', transition: 'all 0.15s',
                        background: activeMatch === i ? confBg(m.confidence) : 'rgba(255,255,255,0.025)',
                        border: `1px solid ${activeMatch === i ? confColor(m.confidence) + '55' : 'rgba(255,255,255,0.07)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: '#f0e8d0', fontStyle: 'italic', flex: 1, lineHeight: 1.5 }}>&ldquo;{m.phrase}&rdquo;</span>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: confColor(m.confidence), whiteSpace: 'nowrap', background: confBg(m.confidence), padding: '2px 7px', borderRadius: 20 }}>{m.confidence}</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#e8b84a', margin: '0 0 2px', fontWeight: 600 }}>📖 {m.probable_source}</p>
                      <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.38)', margin: 0, lineHeight: 1.5 }}>{m.note}</p>
                    </div>
                  ))
              }
            </div>
          </div>
        )}
      </div>

      {/* ── Strengths + Recommendations ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {ai.strengths.length > 0 && (
          <div style={{ padding: '16px 18px', background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>✓ Strengths</p>
            <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {ai.strengths.map((s, i) => <li key={i} style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', lineHeight: 1.7 }}>{s}</li>)}
            </ul>
          </div>
        )}
        {ai.recommendations.length > 0 && (
          <div style={{ padding: '16px 18px', background: 'rgba(201,148,58,0.05)', border: '1px solid rgba(201,148,58,0.18)', borderRadius: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#e8b84a', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>💡 Recommendations</p>
            <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {ai.recommendations.map((r, i) => <li key={i} style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', lineHeight: 1.7 }}>{r}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.2)', lineHeight: 1.7, textAlign: 'center', margin: 0 }}>
        ⓘ AI-based analysis using Groq LLM. Results are indicative — always verify against your institution&apos;s plagiarism policy before journal submission.
      </p>
    </div>
  )
}
