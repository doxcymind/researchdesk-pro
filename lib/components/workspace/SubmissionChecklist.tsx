'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import { supabase } from '@/lib/supabase'

interface ChecklistItem {
  id: string
  text: string
  detail: string | null
  required: boolean
  checked?: boolean
}

interface Category {
  name: string
  icon: string
  items: ChecklistItem[]
}

interface Checklist {
  journal: string
  publisher: string
  referenceStyle: string
  wordLimit: string
  abstractLimit: string
  categories: Category[]
}

interface Props {
  projectId: number
}

const POPULAR_JOURNALS = [
  'New England Journal of Medicine',
  'The Lancet',
  'JAMA',
  'BMJ',
  'Nature Medicine',
  'PLOS ONE',
  'Annals of Internal Medicine',
  'JAMA Internal Medicine',
  'Circulation',
  'Journal of Clinical Oncology',
  'Gut',
  'Radiology',
]

export default function SubmissionChecklist({ projectId }: Props) {
  const [journalInput, setJournalInput] = useState('')
  const [studyType,    setStudyType]    = useState('Original Study')
  const [checklist,    setChecklist]    = useState<Checklist | null>(null)
  const [checked,      setChecked]      = useState<Record<string, boolean>>({})
  const [generating,   setGenerating]   = useState(false)
  const [error,        setError]        = useState('')
  const [suggestions,  setSuggestions]  = useState<string[]>([])
  const [copied,       setCopied]       = useState(false)

  // Load saved state from DB on mount
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return
      const { data } = await supabase
        .from('project_sections')
        .select('content')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .eq('section', '__submission_checklist__')
        .single()
      if (data?.content) {
        try {
          const saved = JSON.parse(data.content)
          setChecklist(saved.checklist)
          setChecked(saved.checked || {})
          setJournalInput(saved.checklist?.journal || '')
        } catch {}
      }
    }
    load()
  }, [projectId])

  // Persist to DB whenever checklist or checked state changes
  const save = useCallback(async (cl: Checklist, ch: Record<string, boolean>) => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return
    const content = JSON.stringify({ checklist: cl, checked: ch })
    const { data: existing } = await supabase
      .from('project_sections')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('section', '__submission_checklist__')
      .single()
    if (existing) {
      await supabase.from('project_sections').update({ content }).eq('id', existing.id).eq('user_id', user.id)
    } else {
      await supabase.from('project_sections').insert({ project_id: projectId, user_id: user.id, section: '__submission_checklist__', content })
    }
  }, [projectId])

  const generate = async () => {
    if (!journalInput.trim()) return
    setGenerating(true)
    setError('')
    setChecklist(null)
    setChecked({})
    setSuggestions([])
    try {
      const res = await apiFetch('/api/submission-checklist', {
        method: 'POST',
        body: JSON.stringify({ journal: journalInput.trim(), studyType }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setChecklist(data)
      setJournalInput(data.journal)
      const initChecked: Record<string, boolean> = {}
      data.categories.forEach((cat: Category) => cat.items.forEach(item => { initChecked[item.id] = false }))
      setChecked(initChecked)
      await save(data, initChecked)
    } catch {
      setError('Failed to generate checklist. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  const toggle = async (id: string) => {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    if (checklist) await save(checklist, next)
  }

  const filterSuggestions = (val: string) => {
    setJournalInput(val)
    if (val.length < 2) { setSuggestions([]); return }
    setSuggestions(POPULAR_JOURNALS.filter(j => j.toLowerCase().includes(val.toLowerCase())).slice(0, 5))
  }

  const totalItems   = checklist?.categories.reduce((s, c) => s + c.items.length, 0) ?? 0
  const checkedCount = Object.values(checked).filter(Boolean).length
  const progress     = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0
  const allDone      = totalItems > 0 && checkedCount === totalItems

  const copyChecklist = async () => {
    if (!checklist) return
    const lines = [`# Submission Checklist — ${checklist.journal}\n`]
    checklist.categories.forEach(cat => {
      lines.push(`\n## ${cat.icon} ${cat.name}`)
      cat.items.forEach(item => {
        lines.push(`- [${checked[item.id] ? 'x' : ' '}] ${item.text}${item.detail ? ` (${item.detail})` : ''}`)
      })
    })
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#f0e8d0', letterSpacing: '-0.4px', margin: '0 0 6px' }}>Submission Checklist</h2>
        <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.35)', margin: 0 }}>
          Pick a journal — get a tailored, actionable submission checklist based on their author guidelines
        </p>
      </div>

      {/* Generator card */}
      <div style={{ background: 'rgba(201,148,58,0.05)', border: '1px solid rgba(201,148,58,0.2)', borderRadius: 18, padding: '24px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(201,148,58,0.5), transparent)', borderRadius: '18px 18px 0 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Journal input */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Journal Name</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={journalInput}
                onChange={e => filterSuggestions(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setSuggestions([]); generate() } }}
                placeholder="e.g. New England Journal of Medicine, The Lancet, BMJ…"
                style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 11, fontSize: 14, color: '#f0e8d0', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.45)')}
                onBlur={e => { setTimeout(() => setSuggestions([]), 200); e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
              />
              {/* Autocomplete dropdown */}
              {suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4, background: '#0d1426', border: '1px solid rgba(201,148,58,0.25)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                  {suggestions.map(s => (
                    <button key={s} onMouseDown={() => { setJournalInput(s); setSuggestions([]) }} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'transparent', border: 'none', color: 'rgba(240,232,208,0.75)', fontSize: 13, cursor: 'pointer', transition: 'background 0.15s', fontFamily: 'inherit' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,148,58,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >{s}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Study type + button row */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Study Type</label>
              <select value={studyType} onChange={e => setStudyType(e.target.value)} style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 11, fontSize: 13, color: '#f0e8d0', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                {['Original Study','Case Report','Case Series','Review Article','Systematic Review','Meta-Analysis','Letter to Editor','Audit','Thesis'].map(t => (
                  <option key={t} value={t} style={{ background: '#0d1426' }}>{t}</option>
                ))}
              </select>
            </div>

            <button
              onClick={generate}
              disabled={generating || !journalInput.trim()}
              style={{
                padding: '12px 28px', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: !journalInput.trim() ? 'not-allowed' : 'pointer',
                background: !journalInput.trim() ? 'rgba(255,255,255,0.05)' : generating ? 'rgba(201,148,58,0.15)' : 'linear-gradient(135deg, #c9943a, #e8b84a)',
                color: !journalInput.trim() ? 'rgba(240,232,208,0.2)' : generating ? '#c9943a' : '#080c18',
                border: generating ? '1px solid rgba(201,148,58,0.3)' : 'none',
                fontFamily: 'inherit', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
              }}
            >
              {generating ? (
                <><span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>◌</span> Generating…</>
              ) : (
                <><span>✦</span> {checklist ? 'Regenerate' : 'Generate Checklist'}</>
              )}
            </button>
          </div>

          {error && <p style={{ fontSize: 12, color: '#f87171', margin: 0, padding: '10px 14px', background: 'rgba(248,113,113,0.06)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)' }}>✕ {error}</p>}
        </div>
      </div>

      {/* Popular journals quick-pick */}
      {!checklist && !generating && (
        <div>
          <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>Popular journals</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {POPULAR_JOURNALS.slice(0, 8).map(j => (
              <button key={j} onClick={() => { setJournalInput(j); setSuggestions([]) }} style={{ padding: '6px 13px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(240,232,208,0.45)', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(201,148,58,0.3)'; e.currentTarget.style.color='rgba(201,148,58,0.8)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; e.currentTarget.style.color='rgba(240,232,208,0.45)' }}
              >{j}</button>
            ))}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {generating && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="skel" style={{ height: 48, borderRadius: 0 }} />
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3,4].map(j => <div key={j} className="skel" style={{ height: 20, borderRadius: 6, width: `${70 + j * 7}%` }} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checklist result */}
      {checklist && !generating && (
        <>
          {/* Journal info bar */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#f0e8d0', margin: '0 0 4px', fontFamily: "var(--font-cinzel), serif" }}>{checklist.journal}</p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {checklist.publisher && <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.35)' }}>{checklist.publisher}</span>}
                {checklist.wordLimit && <span style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)' }}>📝 {checklist.wordLimit}</span>}
                {checklist.abstractLimit && <span style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)' }}>📋 Abstract: {checklist.abstractLimit}</span>}
                {checklist.referenceStyle && <span style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)' }}>📎 {checklist.referenceStyle}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={copyChecklist} style={{ padding: '7px 14px', borderRadius: 9, background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${copied ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.1)'}`, color: copied ? '#34d399' : 'rgba(240,232,208,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                {copied ? '✓ Copied' : '⎘ Copy'}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${allDone ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '16px 20px', transition: 'border-color 0.4s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: allDone ? '#34d399' : '#f0e8d0' }}>
                {allDone ? '🎉 Ready to Submit!' : `${checkedCount} of ${totalItems} items complete`}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: allDone ? '#34d399' : '#c9943a' }}>{progress}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, borderRadius: 3, background: allDone ? 'linear-gradient(90deg, #34d399, #6ee7b7)' : 'linear-gradient(90deg, #c9943a, #e8b84a)', transition: 'width 0.4s ease', boxShadow: allDone ? '0 0 12px rgba(52,211,153,0.4)' : '0 0 12px rgba(201,148,58,0.3)' }} />
            </div>
          </div>

          {/* Categories */}
          {checklist.categories.map((cat, ci) => {
            const catChecked = cat.items.filter(i => checked[i.id]).length
            const catTotal   = cat.items.length
            const catDone    = catChecked === catTotal
            return (
              <div key={ci} style={{ border: `1px solid ${catDone ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.3s' }}>
                {/* Cat header */}
                <div style={{ padding: '14px 20px', background: catDone ? 'rgba(52,211,153,0.04)' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{cat.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: catDone ? '#34d399' : '#f0e8d0' }}>{cat.name}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: catDone ? '#34d399' : 'rgba(240,232,208,0.3)', padding: '2px 10px', borderRadius: 10, background: catDone ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${catDone ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                    {catChecked}/{catTotal}
                  </span>
                </div>

                {/* Items */}
                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {cat.items.map(item => {
                    const isChecked = !!checked[item.id]
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggle(item.id)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 12px', borderRadius: 10, cursor: 'pointer', background: isChecked ? 'rgba(52,211,153,0.04)' : 'transparent', border: '1px solid transparent', textAlign: 'left', transition: 'all 0.18s', fontFamily: 'inherit', outline: 'none', width: '100%' }}
                        onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                        onMouseLeave={e => { if (!isChecked) e.currentTarget.style.background = 'transparent' }}
                      >
                        {/* Checkbox */}
                        <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1, background: isChecked ? 'linear-gradient(135deg, #34d399, #059669)' : 'transparent', border: isChecked ? 'none' : `1.5px solid ${item.required ? 'rgba(201,148,58,0.4)' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: isChecked ? '0 0 10px rgba(52,211,153,0.3)' : 'none' }}>
                          {isChecked && <span style={{ fontSize: 10, color: '#fff', fontWeight: 900 }}>✓</span>}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, color: isChecked ? 'rgba(240,232,208,0.3)' : 'rgba(240,232,208,0.82)', textDecoration: isChecked ? 'line-through' : 'none', lineHeight: 1.4, transition: 'all 0.2s' }}>
                              {item.text}
                            </span>
                            {item.required && !isChecked && (
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(201,148,58,0.1)', color: 'rgba(201,148,58,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>Required</span>
                            )}
                          </div>
                          {item.detail && !isChecked && (
                            <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: '3px 0 0', lineHeight: 1.5 }}>{item.detail}</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes skelPulse { 0%,100%{opacity:0.04} 50%{opacity:0.09} }
        .skel { background: rgba(240,232,208,1); animation: skelPulse 1.6s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
