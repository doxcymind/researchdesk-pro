'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props { projectId: number; studyType?: string; manuscriptSections?: string[]; onNavigate?: (section: string) => void }
interface ChecklistItem { id: string; item: string; completed: boolean }
interface SectionDraft { section: string; content: string }

function sectionToCheckItem(s: string): string {
  if (s === 'References') return 'References added'
  if (s === 'Plagiarism Check') return 'Plagiarism check done'
  return `${s} written`
}

const SECTION_ICONS: Record<string, string> = {
  Abstract: '✦', Introduction: '⬡', 'Case Presentation': '📋',
  Methods: '⚙', Results: '◉', Discussion: '◎', Conclusion: '◈',
  References: '⊞', 'Plagiarism Check': '⚑',
  'Case Presentations': '📋', 'Literature Review': '📖',
}

const WORD_TARGETS: Record<string, number> = {
  Abstract: 250, Introduction: 500, 'Case Presentation': 600, 'Case Presentations': 800,
  Methods: 600, Results: 500, Discussion: 700, Conclusion: 250,
  References: 300, 'Literature Review': 1000,
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function statusFromWords(section: string, wc: number): 'empty' | 'started' | 'good' | 'done' {
  const target = WORD_TARGETS[section] || 400
  if (wc === 0) return 'empty'
  if (wc < target * 0.25) return 'started'
  if (wc < target * 0.8) return 'good'
  return 'done'
}

const STATUS_COLOR: Record<string, string> = {
  empty: 'rgba(240,232,208,0.15)', started: '#fbbf24', good: '#fb923c', done: '#34d399'
}
const STATUS_LABEL: Record<string, string> = {
  empty: 'Not started', started: 'Started', good: 'In progress', done: 'Complete'
}

export default function OverviewPanel({ projectId, studyType, manuscriptSections, onNavigate }: Props) {
  const [documents, setDocuments]   = useState(0)
  const [activities, setActivities] = useState<any[]>([])
  const [checklist, setChecklist]   = useState<ChecklistItem[]>([])
  const [drafts, setDrafts]         = useState<SectionDraft[]>([])
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const initRef = useRef<number | null>(null)

  const editorSections = (manuscriptSections ?? []).filter(s => s !== 'Plagiarism Check')

  useEffect(() => {
    if (initRef.current === projectId) return
    initRef.current = projectId
    fetchAll()
  }, [projectId])

  const fetchAll = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const [{ count: docsCount }, { data: checks }, { data: activityData }, { data: sectionData }] = await Promise.all([
        supabase.from('uploads').select('*', { count: 'exact', head: true }).eq('project_id', projectId).eq('user_id', user.id),
        supabase.from('publication_checks').select('*').eq('project_id', projectId).eq('user_id', user.id),
        supabase.from('activity_logs').select('*').eq('project_id', projectId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
        supabase.from('project_sections').select('section, content').eq('project_id', projectId).eq('user_id', user.id),
      ])

      setDocuments(docsCount || 0)
      setActivities(activityData || [])
      setDrafts(sectionData || [])

      const seen = new Set<string>()
      const unique = (checks || []).filter((c: ChecklistItem) => {
        if (seen.has(c.item)) return false; seen.add(c.item); return true
      })

      // If no checklist rows exist yet, create them and set state directly
      if (unique.length === 0) {
        const sections = (manuscriptSections ?? ['Abstract', 'Introduction', 'Discussion', 'Conclusion', 'References'])
          .filter(s => s !== 'Plagiarism Check')
        const items = sections.map(s => sectionToCheckItem(s))
        const { data: inserted } = await supabase
          .from('publication_checks')
          .insert(items.map(item => ({ project_id: projectId, user_id: user.id, item, completed: false })))
          .select()
        setChecklist(inserted || items.map((item, i) => ({ id: String(i), item, completed: false })))
      } else {
        setChecklist(unique)
      }
    } catch (e) {
      console.error('fetchAll error:', e)
      // Fallback: show static checklist from sections even if DB fails
      const sections = (manuscriptSections ?? ['Abstract', 'Introduction', 'Discussion', 'Conclusion', 'References'])
        .filter(s => s !== 'Plagiarism Check')
      setChecklist(sections.map((s, i) => ({ id: String(i), item: sectionToCheckItem(s), completed: false })))
    }
  }

  const toggleItem = async (id: string, current: boolean) => {
    const next = !current
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, completed: next } : c))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return
      await supabase.from('publication_checks').update({ completed: next }).eq('id', id).eq('user_id', user.id)
    } catch {
      setChecklist(prev => prev.map(c => c.id === id ? { ...c, completed: current } : c))
    }
  }

  const checksCompleted = checklist.filter(c => c.completed).length
  const totalChecks     = checklist.length
  const progress        = totalChecks > 0 ? Math.round((checksCompleted / totalChecks) * 100) : 0

  useEffect(() => {
    const t = setTimeout(() => setAnimatedProgress(progress), 400)
    return () => clearTimeout(t)
  }, [progress])

  const draftMap: Record<string, string> = {}
  for (const d of drafts) draftMap[d.section] = d.content

  const totalWords = editorSections.reduce((sum, s) => sum + wordCount(draftMap[s] || ''), 0)

  const sectionsWithStatus = editorSections.map(s => {
    const wc     = wordCount(draftMap[s] || '')
    const target = WORD_TARGETS[s] || 400
    const status = statusFromWords(s, wc)
    const pct    = Math.min(100, Math.round((wc / target) * 100))
    return { section: s, wc, target, status, pct }
  })

  const nextSection = sectionsWithStatus.find(s => s.status === 'empty' || s.status === 'started')

  const R = 60; const CIRC = 2 * Math.PI * R
  const dash = (animatedProgress / 100) * CIRC
  const scoreColor = progress >= 75 ? '#34d399' : progress >= 40 ? '#fbbf24' : 'rgba(201,148,58,0.7)'
  const scoreLabel = progress >= 75 ? 'Publication Ready' : progress >= 40 ? 'In Progress' : 'Early Draft'

  const relTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── TOP ROW: score + stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>

        {/* Score ring */}
        <div style={{ gridColumn: '1', background: 'linear-gradient(135deg,#0d1426,#080c18)', border: '1px solid rgba(201,148,58,0.3)', borderRadius: 20, padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 220, height: 220, background: `radial-gradient(ellipse, ${scoreColor}0d 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <p style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', margin: 0 }}>Publication Readiness</p>
          <div style={{ position: 'relative' }}>
            <svg width={140} height={140} viewBox="0 0 140 140">
              <circle cx={70} cy={70} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} />
              <circle cx={70} cy={70} r={R} fill="none" stroke={scoreColor} strokeWidth={10}
                strokeLinecap="round" strokeDasharray={`${dash} ${CIRC}`}
                transform="rotate(-90 70 70)"
                style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${scoreColor}88)` }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{progress}</span>
              <span style={{ fontSize: 9, color: 'rgba(201,148,58,0.4)', letterSpacing: '0.1em' }}>/ 100</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f0e8d0', margin: '0 0 4px' }}>{scoreLabel}</p>
            <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.35)', margin: 0 }}>{checksCompleted} of {totalChecks} milestones</p>
          </div>
        </div>

        {/* Stats column */}
        <div style={{ gridColumn: '2 / 4', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 2 stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            {[
              { icon: '📄', label: 'Uploads', val: documents, color: '#c9943a' },
              { icon: '✓', label: 'Sections Done', val: `${sectionsWithStatus.filter(s => s.status === 'done').length}/${editorSections.length}`, color: '#34d399' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: '0 0 4px', lineHeight: 1 }}>{s.val}</p>
                <p style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Next action card */}
          {nextSection ? (
            <div onClick={() => onNavigate?.(nextSection.section)}
              style={{ background: 'rgba(201,148,58,0.05)', border: '1px solid rgba(201,148,58,0.2)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: onNavigate ? 'pointer' : 'default', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (onNavigate) { (e.currentTarget as HTMLElement).style.background = 'rgba(201,148,58,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,148,58,0.4)' } }}
              onMouseLeave={e => { if (onNavigate) { (e.currentTarget as HTMLElement).style.background = 'rgba(201,148,58,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,148,58,0.2)' } }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(201,148,58,0.12)', border: '1px solid rgba(201,148,58,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                {SECTION_ICONS[nextSection.section] || '✎'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Up next</p>
                <p style={{ fontSize: 14, color: '#f0e8d0', margin: 0, fontWeight: 600 }}>Write your {nextSection.section}</p>
                <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.35)', margin: '2px 0 0' }}>
                  {nextSection.wc > 0 ? `${nextSection.wc} words so far · target ${nextSection.target}` : `Target ~${nextSection.target} words`}
                </p>
              </div>
              <div style={{ fontSize: 18, color: 'rgba(201,148,58,0.4)' }}>→</div>
            </div>
          ) : (
            <div style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 22 }}>🎉</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#34d399', margin: '0 0 3px' }}>All sections written!</p>
                <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.4)', margin: 0 }}>Run plagiarism check and export your manuscript.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION PROGRESS ── */}
      <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✎</div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f0e8d0', margin: 0 }}>Section Progress</h3>
              <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: 0 }}>Word count per section · click to open</p>
            </div>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.25)' }}>{totalWords.toLocaleString()} total words</span>
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sectionsWithStatus.map(s => (
            <div key={s.section} onClick={() => onNavigate?.(s.section)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', cursor: onNavigate ? 'pointer' : 'default', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (onNavigate) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.035)' }}
              onMouseLeave={e => { if (onNavigate) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.015)' }}>
              <span style={{ fontSize: 13, width: 18, textAlign: 'center', flexShrink: 0 }}>{SECTION_ICONS[s.section] || '◦'}</span>
              <span style={{ fontSize: 12, color: s.status === 'empty' ? 'rgba(240,232,208,0.3)' : 'rgba(240,232,208,0.75)', width: 140, flexShrink: 0, fontWeight: s.status !== 'empty' ? 500 : 400 }}>{s.section}</span>
              <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.pct}%`, borderRadius: 3, background: STATUS_COLOR[s.status], transition: 'width 0.8s ease', boxShadow: s.status === 'done' ? '0 0 8px rgba(52,211,153,0.4)' : 'none' }} />
              </div>
              <span style={{ fontSize: 11, color: STATUS_COLOR[s.status], fontWeight: 600, width: 72, textAlign: 'right', flexShrink: 0 }}>
                {s.status === 'empty' ? '—' : `${s.wc} / ${s.target}`}
              </span>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${STATUS_COLOR[s.status]}18`, color: STATUS_COLOR[s.status], border: `1px solid ${STATUS_COLOR[s.status]}33`, flexShrink: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {STATUS_LABEL[s.status]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM ROW: checklist + activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Checklist */}
        <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(201,148,58,0.15)', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(201,148,58,0.1)', background: 'linear-gradient(90deg,rgba(201,148,58,0.05),transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#c9943a' }}>✦</span>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f0e8d0', margin: 0 }}>Publication Checklist</h3>
                <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: 0 }}>Tick off as you complete each section</p>
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
              background: checksCompleted === totalChecks && totalChecks > 0 ? 'rgba(52,211,153,0.12)' : 'rgba(201,148,58,0.08)',
              border: `1px solid ${checksCompleted === totalChecks && totalChecks > 0 ? 'rgba(52,211,153,0.3)' : 'rgba(201,148,58,0.2)'}`,
              color: checksCompleted === totalChecks && totalChecks > 0 ? '#34d399' : '#c9943a' }}>
              {checksCompleted === totalChecks && totalChecks > 0 ? '✓ All done' : `${checksCompleted} / ${totalChecks}`}
            </span>
          </div>
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {checklist.length === 0 ? (
              <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.2)', textAlign: 'center', padding: '16px 0', margin: 0 }}>Loading checklist…</p>
            ) : checklist.map(item => (
              <button key={item.id} onClick={() => toggleItem(item.id, item.completed)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', border: 'none', textAlign: 'left', fontFamily: 'inherit',
                  background: item.completed ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.02)',
                  outline: 'none', transition: 'all 0.15s' }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: item.completed ? 'linear-gradient(135deg,#34d399,#059669)' : 'transparent',
                  border: item.completed ? 'none' : '1.5px solid rgba(201,148,58,0.3)',
                  boxShadow: item.completed ? '0 0 10px rgba(52,211,153,0.3)' : 'none', transition: 'all 0.15s' }}>
                  {item.completed && <span style={{ fontSize: 10, color: '#fff', fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: item.completed ? 'rgba(240,232,208,0.3)' : 'rgba(240,232,208,0.7)', textDecoration: item.completed ? 'line-through' : 'none', flex: 1 }}>{item.item}</span>
              </button>
            ))}
          </div>
          {/* mini progress bar */}
          {totalChecks > 0 && (
            <div style={{ padding: '0 12px 12px', display: 'flex', gap: 3 }}>
              {Array.from({ length: totalChecks }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2,
                  background: i < checksCompleted ? scoreColor : 'rgba(255,255,255,0.07)',
                  transition: 'background 0.4s' }} />
              ))}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: 'rgba(240,232,208,0.4)' }}>◎</span>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f0e8d0', margin: 0 }}>Activity Log</h3>
                <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: 0 }}>Workspace timeline</p>
              </div>
            </div>
            {activities.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 5px #34d399' }} />
                <span style={{ fontSize: 10, color: 'rgba(52,211,153,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live</span>
              </div>
            )}
          </div>
          <div style={{ padding: '8px 12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {activities.length === 0 ? (
              <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.2)', textAlign: 'center', padding: '20px 0', margin: 0, fontStyle: 'italic' }}>No activity yet — start writing!</p>
            ) : activities.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 9, background: i === 0 ? 'rgba(201,148,58,0.04)' : 'transparent' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  background: i === 0 ? 'rgba(201,148,58,0.12)' : 'rgba(255,255,255,0.03)',
                  border: i === 0 ? '1px solid rgba(201,148,58,0.2)' : '1px solid rgba(255,255,255,0.05)',
                  color: i === 0 ? '#c9943a' : 'rgba(240,232,208,0.3)' }}>
                  {a.action.startsWith('Saved') ? '💾' : a.action.startsWith('AI') ? '✦' : a.action.startsWith('Upload') ? '↑' : a.action.startsWith('Export') ? '⬇' : '·'}
                </div>
                <span style={{ flex: 1, fontSize: 12, color: i === 0 ? 'rgba(240,232,208,0.8)' : 'rgba(240,232,208,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.action}</span>
                <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.2)', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: 20 }}>{relTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .overview-top { grid-template-columns: 1fr !important; }
          .overview-bottom { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
