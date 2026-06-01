'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'

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

const SEVERITY_COLOR: Record<string, string> = {
  low:    'rgba(234,179,8,0.15)',
  medium: 'rgba(249,115,22,0.15)',
  high:   'rgba(239,68,68,0.15)',
}
const SEVERITY_BORDER: Record<string, string> = {
  low:    'rgba(234,179,8,0.4)',
  medium: 'rgba(249,115,22,0.4)',
  high:   'rgba(239,68,68,0.5)',
}
const SEVERITY_TEXT: Record<string, string> = {
  low:    '#fbbf24',
  medium: '#fb923c',
  high:   '#f87171',
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#f87171'
  const r = 44
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - score / 100)
  return (
    <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
      <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={60} cy={60} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={10} />
        <circle
          cx={60} cy={60} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 26, fontWeight: 700, color }}>{score}%</span>
        <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.4)', marginTop: 1 }}>Original</span>
      </div>
    </div>
  )
}

export default function PlagiarismPanel({ projectId }: PlagiarismPanelProps) {
  const [text, setText] = useState('')
  const [analysing, setAnalysing] = useState(false)
  const [submittingCL, setSubmittingCL] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [copyleaksMsg, setCopyleaksMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [activeTab, setActiveTab] = useState<'ai' | 'copyleaks'>('ai')

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  const runAIAnalysis = async () => {
    if (!text.trim()) { setError('Please paste your manuscript text above.'); return }
    setError(null)
    setResult(null)
    setAnalysing(true)
    try {
      const res = await apiFetch('/api/plagiarism', {
        method: 'POST',
        body: JSON.stringify({ text }),
      })
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

  const runCopyleaksScan = async () => {
    if (!text.trim()) { setError('Please paste your manuscript text above.'); return }
    setError(null)
    setCopyleaksMsg(null)
    setSubmittingCL(true)
    try {
      const res = await apiFetch('/api/plagiarism/copyleaks', {
        method: 'POST',
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setCopyleaksMsg(data.message || 'Scan submitted successfully.')
    } catch {
      setError('Copyleaks submission failed. Please try again.')
    } finally {
      setSubmittingCL(false)
    }
  }

  const riskColors: Record<string, string> = { low: '#4ade80', medium: '#fbbf24', high: '#f87171' }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f0e8d0', margin: '0 0 6px' }}>
          Plagiarism Check
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.45)', margin: 0, lineHeight: 1.6 }}>
          Paste your manuscript text below to analyse for originality. The AI analysis runs instantly; Copyleaks cross-references global academic databases.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['ai', 'copyleaks'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 18px', borderRadius: 10,
              background: activeTab === tab ? 'rgba(201,148,58,0.15)' : 'rgba(255,255,255,0.04)',
              border: activeTab === tab ? '1px solid rgba(201,148,58,0.5)' : '1px solid rgba(255,255,255,0.08)',
              color: activeTab === tab ? '#e8b84a' : 'rgba(240,232,208,0.5)',
              fontSize: 13, fontWeight: activeTab === tab ? 600 : 400, cursor: 'pointer',
            }}
          >
            {tab === 'ai' ? '✦ AI Originality Analysis' : '🔎 Copyleaks Scan'}
          </button>
        ))}
      </div>

      {/* Text Input */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <label style={{ fontSize: 12, color: 'rgba(240,232,208,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Manuscript Text
          </label>
          <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.3)' }}>
            {wordCount.toLocaleString()} words {text.length > 0 && `· ${text.length.toLocaleString()} chars`}
          </span>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste your abstract, introduction, methods, results, or full manuscript text here…"
          rows={10}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: '14px 16px',
            color: '#f0e8d0', fontSize: 13, lineHeight: 1.7,
            resize: 'vertical', fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        {truncated && (
          <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.35)', marginTop: 4 }}>
            ⚠ Text was trimmed to 12,000 characters for AI analysis. Full text was submitted to Copyleaks.
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* AI Tab */}
      {activeTab === 'ai' && (
        <>
          <button
            onClick={runAIAnalysis}
            disabled={analysing || !text.trim()}
            style={{
              padding: '11px 28px', borderRadius: 12,
              background: analysing || !text.trim()
                ? 'rgba(201,148,58,0.25)'
                : 'linear-gradient(135deg, #c9943a, #e8b84a)',
              color: analysing || !text.trim() ? 'rgba(8,12,24,0.5)' : '#080c18',
              fontSize: 13, fontWeight: 700, border: 'none',
              cursor: analysing || !text.trim() ? 'not-allowed' : 'pointer',
              marginBottom: 28,
            }}
          >
            {analysing ? '⏳ Analysing…' : '✦ Run AI Originality Analysis'}
          </button>

          {result && (
            <div>
              {/* Score + Risk */}
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 24, padding: '20px 24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }}>
                <ScoreRing score={result.originality_score} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#f0e8d0' }}>Originality Score</span>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                      background: result.risk_level === 'low' ? 'rgba(74,222,128,0.15)' : result.risk_level === 'medium' ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)',
                      color: riskColors[result.risk_level],
                      border: `1px solid ${result.risk_level === 'low' ? 'rgba(74,222,128,0.35)' : result.risk_level === 'medium' ? 'rgba(251,191,36,0.35)' : 'rgba(248,113,113,0.35)'}`,
                    }}>
                      {result.risk_level} risk
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.6)', margin: 0, lineHeight: 1.7 }}>{result.summary}</p>
                </div>
              </div>

              {/* Flagged Phrases */}
              {result.flagged_phrases.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'rgba(240,232,208,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
                    ⚑ Flagged Phrases ({result.flagged_phrases.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.flagged_phrases.map((phrase, i) => (
                      <div key={i} style={{
                        padding: '12px 16px', borderRadius: 10,
                        background: SEVERITY_COLOR[phrase.severity] || SEVERITY_COLOR.medium,
                        border: `1px solid ${SEVERITY_BORDER[phrase.severity] || SEVERITY_BORDER.medium}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <span style={{ fontSize: 13, color: '#f0e8d0', fontStyle: 'italic', lineHeight: 1.5, flex: 1 }}>
                            &ldquo;{phrase.text}&rdquo;
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                            color: SEVERITY_TEXT[phrase.severity] || SEVERITY_TEXT.medium,
                            whiteSpace: 'nowrap', marginTop: 2,
                          }}>
                            {phrase.severity}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.5)', margin: '6px 0 0', lineHeight: 1.5 }}>{phrase.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Strengths */}
                {result.strengths.length > 0 && (
                  <div style={{ padding: '16px 18px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 12 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#4ade80', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      ✓ Strengths
                    </h3>
                    <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {result.strengths.map((s, i) => (
                        <li key={i} style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', lineHeight: 1.6 }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <div style={{ padding: '16px 18px', background: 'rgba(201,148,58,0.06)', border: '1px solid rgba(201,148,58,0.2)', borderRadius: 12 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#e8b84a', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      💡 Recommendations
                    </h3>
                    <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {result.recommendations.map((r, i) => (
                        <li key={i} style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', lineHeight: 1.6 }}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <p style={{ marginTop: 16, fontSize: 11, color: 'rgba(240,232,208,0.25)', lineHeight: 1.6 }}>
                ⓘ AI analysis is indicative only. For definitive plagiarism detection, use the Copyleaks scan tab which cross-references published academic literature.
              </p>
            </div>
          )}
        </>
      )}

      {/* Copyleaks Tab */}
      {activeTab === 'copyleaks' && (
        <div>
          <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f0e8d0', margin: '0 0 8px' }}>About Copyleaks</h3>
            <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.5)', margin: '0 0 8px', lineHeight: 1.7 }}>
              Copyleaks cross-references your text against billions of internet pages, academic journals, and previously submitted documents. Results are ready in 1–3 minutes.
            </p>
            <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0 }}>
              Requires <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>COPYLEAKS_EMAIL</code> and <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>COPYLEAKS_KEY</code> environment variables set on Vercel.
            </p>
          </div>

          {copyleaksMsg ? (
            <div style={{ padding: '16px 20px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 12, marginBottom: 20 }}>
              <p style={{ fontSize: 14, color: '#4ade80', margin: '0 0 6px', fontWeight: 600 }}>✓ Scan Submitted</p>
              <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.6)', margin: '0 0 12px', lineHeight: 1.6 }}>{copyleaksMsg}</p>
              <a
                href="https://app.copyleaks.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: '#e8b84a', textDecoration: 'none', fontWeight: 500 }}
              >
                View results on Copyleaks Dashboard →
              </a>
            </div>
          ) : (
            <button
              onClick={runCopyleaksScan}
              disabled={submittingCL || !text.trim()}
              style={{
                padding: '11px 28px', borderRadius: 12,
                background: submittingCL || !text.trim()
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(255,255,255,0.08)',
                color: submittingCL || !text.trim() ? 'rgba(240,232,208,0.3)' : '#f0e8d0',
                fontSize: 13, fontWeight: 600, border: '1px solid rgba(255,255,255,0.12)',
                cursor: submittingCL || !text.trim() ? 'not-allowed' : 'pointer',
                marginBottom: 28,
              }}
            >
              {submittingCL ? '⏳ Submitting…' : '🔎 Submit to Copyleaks'}
            </button>
          )}

          <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.3)', margin: 0, lineHeight: 1.7 }}>
              <strong style={{ color: 'rgba(240,232,208,0.45)' }}>Setup:</strong> Create a free account at <a href="https://copyleaks.com" target="_blank" rel="noopener noreferrer" style={{ color: '#e8b84a', textDecoration: 'none' }}>copyleaks.com</a>, then add your email and API key to Vercel environment variables as <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: 3 }}>COPYLEAKS_EMAIL</code> and <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: 3 }}>COPYLEAKS_KEY</code>.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
