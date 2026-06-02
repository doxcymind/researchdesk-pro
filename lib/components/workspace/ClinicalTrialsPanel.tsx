'use client'

import { useState, useRef, useEffect } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import { supabase } from '@/lib/supabase'

interface Trial {
  nctId: string
  title: string
  officialTitle: string
  status: string
  phase: string
  studyType: string
  startDate: string
  completionDate: string
  enrollment: number | null
  conditions: string[]
  interventions: string[]
  summary: string
  sponsor: string
  countries: string[]
}

const STATUS_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  'RECRUITING':           { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
  'COMPLETED':            { color: '#63b3ed', bg: 'rgba(99,179,237,0.1)',  border: 'rgba(99,179,237,0.25)' },
  'ACTIVE_NOT_RECRUITING':{ color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  'NOT_YET_RECRUITING':   { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
  'TERMINATED':           { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
  'WITHDRAWN':            { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
  'ENROLLING_BY_INVITATION': { color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)' },
}

const DEFAULT_STATUS = { color: 'rgba(240,232,208,0.4)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' }

function formatStatus(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

interface Props {
  projectId?: number
  projectTitle?: string
  studyType?: string
}

export default function ClinicalTrialsPanel({ projectId, projectTitle, studyType }: Props) {
  const shortTitle = projectTitle
    ? projectTitle.split(/\s*[-:]\s*/)[0].trim().split(/\s+/).slice(0, 6).join(' ')
    : ''

  const [query, setQuery] = useState(shortTitle)
  const [results, setResults] = useState<Trial[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [addingId, setAddingId] = useState<string | null>(null)

  // AI suggestion state
  const [aiSuggestions, setAiSuggestions] = useState<string>('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDone, setAiDone] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-search on mount using project title
  useEffect(() => {
    if (shortTitle) search(shortTitle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const search = async (q = query) => {
    if (!q.trim()) return
    setLoading(true); setSearched(true); setResults([]); setExpanded(null)
    try {
      const res = await apiFetch(`/api/clinical-trials?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.studies || [])
      setTotal(data.total || 0)
    } catch { setResults([]) }
    setLoading(false)
  }

  const addToReferences = async (trial: Trial) => {
    if (!projectId) return
    setAddingId(trial.nctId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { setAddingId(null); return }

      const phase = trial.phase ? ` Phase ${trial.phase}.` : ''
      const formatted = `${trial.sponsor ? trial.sponsor + '. ' : ''}${trial.title}.${phase} ClinicalTrials.gov Identifier: ${trial.nctId}. Available from: https://clinicaltrials.gov/study/${trial.nctId}`

      const citation = {
        id: `ct_${trial.nctId}`,
        text: formatted,
        style: 'Vancouver',
        input: trial.title,
        type: 'clinical_trial',
        url: `https://clinicaltrials.gov/study/${trial.nctId}`,
      }

      const { data: existing_row } = await supabase.from('project_sections')
        .select('id, content').eq('project_id', projectId).eq('user_id', user.id).eq('section', '__citations__').single()

      let existing: any[] = []
      try { existing = JSON.parse(existing_row?.content || '[]') } catch { existing = [] }
      const updated = [...existing.filter((c: any) => c.id !== citation.id), citation]

      if (existing_row?.id) {
        await supabase.from('project_sections').update({ content: JSON.stringify(updated) }).eq('id', existing_row.id).eq('user_id', user.id)
      } else {
        await supabase.from('project_sections').insert({ project_id: projectId, user_id: user.id, section: '__citations__', content: JSON.stringify(updated) })
      }
      setAddedIds(prev => new Set([...prev, trial.nctId]))
    } catch {}
    setAddingId(null)
  }

  const getAiSuggestions = async () => {
    if (!results.length || !projectTitle) return
    setAiLoading(true)
    setAiDone(false)
    setAiSuggestions('')
    try {
      const trialList = results.slice(0, 8).map((t, i) =>
        `${i + 1}. [${t.nctId}] ${t.title} — ${formatStatus(t.status)}${t.phase ? `, ${t.phase}` : ''}${t.enrollment ? `, n=${t.enrollment}` : ''}`
      ).join('\n')

      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle,
          studyType: studyType || '',
          projectId,
          messages: [{
            role: 'user',
            content: `I am writing a ${studyType || 'manuscript'} titled "${projectTitle}".

Here are clinical trials I found related to my topic:
${trialList}

For each relevant trial, tell me:
1. Which section of my manuscript to cite it in (Introduction / Methods / Discussion)
2. Why it's relevant and what specific claim it supports
3. Whether it strengthens or contradicts my topic

Be specific and concise. Format as a numbered list matching the trial numbers above. Skip trials that are not relevant.`,
          }],
        }),
      })
      const data = await res.json()
      setAiSuggestions(data.reply || 'No suggestions available.')
      setAiDone(true)
    } catch {
      setAiSuggestions('AI suggestion failed. Please try again.')
      setAiDone(true)
    }
    setAiLoading(false)
  }

  const cite = (trial: Trial) => {
    const authors = trial.sponsor ? `${trial.sponsor}.` : ''
    const phase = trial.phase ? ` Phase ${trial.phase}.` : ''
    const citation = `${authors} ${trial.title}.${phase} ClinicalTrials.gov Identifier: ${trial.nctId}. Available from: https://clinicaltrials.gov/study/${trial.nctId}`
    navigator.clipboard.writeText(citation)
    setCopied(trial.nctId)
    setTimeout(() => setCopied(null), 2000)
  }

  const copyId = (nctId: string) => {
    navigator.clipboard.writeText(`https://clinicaltrials.gov/study/${nctId}`)
    setCopied(`link-${nctId}`)
    setTimeout(() => setCopied(null), 2000)
  }

  const inter = "var(--font-inter),'DM Sans',system-ui,sans-serif"
  const cinzel = "var(--font-cinzel),'Cormorant Garamond',Georgia,serif"

  return (
    <div style={{ padding: 'clamp(16px,3vw,28px)', fontFamily: inter }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px', fontWeight: 700 }}>✦ ClinicalTrials.gov</p>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f0e8d0', margin: '0 0 6px', fontFamily: cinzel }}>Trial Search</h2>
        <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.4)', margin: 0 }}>Trials auto-searched from your project title. Ask AI which ones to cite and where.</p>
      </div>

      {/* Search box */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="e.g. type 2 diabetes metformin RCT"
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f0e8d0', fontSize: 13, fontFamily: inter, outline: 'none' }}
          onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button
          onClick={() => search()}
          disabled={loading || !query.trim()}
          style={{ padding: '10px 18px', borderRadius: 10, background: loading ? 'rgba(201,148,58,0.08)' : 'linear-gradient(135deg,#c9943a,#e8b84a)', color: loading ? 'rgba(201,148,58,0.4)' : '#080c18', border: 'none', fontWeight: 700, fontSize: 13, cursor: loading || !query.trim() ? 'not-allowed' : 'pointer', fontFamily: inter, whiteSpace: 'nowrap' }}
        >
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {/* Quick filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {['Randomized Controlled Trial', 'Systematic Review', 'Phase 3', 'Recruiting', 'Completed'].map(tag => (
          <button key={tag} onClick={() => { setQuery(tag); search(tag) }} style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(240,232,208,0.45)', fontSize: 11, cursor: 'pointer', fontFamily: inter }}>
            {tag}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 80, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && searched && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(240,232,208,0.3)', fontSize: 14 }}>
          No trials found for "{query}"
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          {/* Results count + AI Suggest button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: 0 }}>
              Showing {results.length} of {total.toLocaleString()} results
            </p>
            <button
              onClick={getAiSuggestions}
              disabled={aiLoading}
              style={{ padding: '6px 14px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: aiLoading ? 'wait' : 'pointer', fontFamily: inter, display: 'flex', alignItems: 'center', gap: 6,
                background: aiDone ? 'rgba(52,211,153,0.1)' : 'rgba(201,148,58,0.12)',
                border: `1px solid ${aiDone ? 'rgba(52,211,153,0.3)' : 'rgba(201,148,58,0.3)'}`,
                color: aiDone ? '#34d399' : '#c9943a' }}>
              {aiLoading ? '✦ Analysing…' : aiDone ? '✓ AI Suggestions' : '✦ Ask AI: Which to cite?'}
            </button>
          </div>

          {/* AI Suggestions panel */}
          {(aiLoading || aiSuggestions) && (
            <div style={{ marginBottom: 16, padding: '16px 18px', borderRadius: 14, background: 'rgba(201,148,58,0.04)', border: '1px solid rgba(201,148,58,0.15)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px' }}>✦ AI Citation Suggestions</p>
              {aiLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(201,148,58,0.2)', borderTopColor: '#c9943a', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.4)' }}>Analysing trials against your manuscript…</span>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.7)', margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{aiSuggestions}</p>
              )}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map(trial => {
              const sc = STATUS_COLOR[trial.status] || DEFAULT_STATUS
              const isExpanded = expanded === trial.nctId
              return (
                <div key={trial.nctId} style={{ borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${isExpanded ? 'rgba(201,148,58,0.2)' : 'rgba(255,255,255,0.07)'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                  {/* Card header — always visible */}
                  <div
                    onClick={() => setExpanded(isExpanded ? null : trial.nctId)}
                    style={{ padding: '14px 16px', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#f0e8d0', margin: 0, lineHeight: 1.4 }}>{trial.title}</p>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {formatStatus(trial.status)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'rgba(201,148,58,0.7)', fontWeight: 600, fontFamily: 'monospace' }}>{trial.nctId}</span>
                      {trial.phase && <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.4)', padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>{trial.phase}</span>}
                      {trial.studyType && <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.4)' }}>{trial.studyType}</span>}
                      {trial.enrollment && <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.35)' }}>n={trial.enrollment.toLocaleString()}</span>}
                      <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.2)', marginLeft: 'auto' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {/* Conditions + Interventions */}
                      {trial.conditions.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <p style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px', fontWeight: 700 }}>Conditions</p>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {trial.conditions.slice(0, 5).map(c => <span key={c} style={{ fontSize: 11, padding: '2px 9px', borderRadius: 10, background: 'rgba(99,179,237,0.08)', border: '1px solid rgba(99,179,237,0.15)', color: 'rgba(99,179,237,0.8)' }}>{c}</span>)}
                          </div>
                        </div>
                      )}
                      {trial.interventions.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <p style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px', fontWeight: 700 }}>Interventions</p>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {trial.interventions.map(i => <span key={i} style={{ fontSize: 11, padding: '2px 9px', borderRadius: 10, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)', color: 'rgba(167,139,250,0.8)' }}>{i}</span>)}
                          </div>
                        </div>
                      )}
                      {/* Dates + Sponsor */}
                      <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                        {trial.startDate && <div><p style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Start</p><p style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', margin: 0 }}>{trial.startDate}</p></div>}
                        {trial.completionDate && <div><p style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Completion</p><p style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', margin: 0 }}>{trial.completionDate}</p></div>}
                        {trial.sponsor && <div><p style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sponsor</p><p style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', margin: 0 }}>{trial.sponsor}</p></div>}
                      </div>
                      {/* Summary */}
                      {trial.summary && (
                        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.5)', margin: 0, lineHeight: 1.65 }}>{trial.summary.slice(0, 300)}{trial.summary.length > 300 ? '…' : ''}</p>
                        </div>
                      )}
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                        {projectId && (
                          <button
                            onClick={() => addToReferences(trial)}
                            disabled={addingId === trial.nctId || addedIds.has(trial.nctId)}
                            style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: addedIds.has(trial.nctId) ? 'default' : 'pointer', fontFamily: inter,
                              background: addedIds.has(trial.nctId) ? 'rgba(52,211,153,0.1)' : 'rgba(201,148,58,0.12)',
                              border: `1px solid ${addedIds.has(trial.nctId) ? 'rgba(52,211,153,0.3)' : 'rgba(201,148,58,0.3)'}`,
                              color: addedIds.has(trial.nctId) ? '#34d399' : '#c9943a' }}>
                            {addedIds.has(trial.nctId) ? '✓ Added to References' : addingId === trial.nctId ? 'Adding…' : '+ Add to References'}
                          </button>
                        )}
                        <button onClick={() => cite(trial)} style={{ padding: '7px 14px', borderRadius: 8, background: copied === trial.nctId ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${copied === trial.nctId ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)'}`, color: copied === trial.nctId ? '#34d399' : 'rgba(240,232,208,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: inter }}>
                          {copied === trial.nctId ? '✓ Copied' : '📎 Copy Citation'}
                        </button>
                        <a href={`https://clinicaltrials.gov/study/${trial.nctId}`} target="_blank" rel="noopener" style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(240,232,208,0.5)', fontSize: 12, textDecoration: 'none', fontFamily: inter }}>
                          View on CT.gov ↗
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.7}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
