'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api-fetch'

interface Props { projectId: number; studyType?: string; manuscriptSections?: string[]; onNavigate?: (section: string) => void; projectTitle?: string }

interface Article {
  id: string; title: string; authors: string; journal: string
  date: string; doi: string | null; url: string; pubtype: string
  volume: string; issue: string; pages: string
  source?: 'pubmed' | 'semantic_scholar' | 'europe_pmc'
  openAccess?: boolean; pdfUrl?: string | null
}
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

const LITERATURE_TYPES = new Set(['Review Article', 'Systematic Review', 'Meta-Analysis', 'Thesis'])

export default function OverviewPanel({ projectId, studyType, manuscriptSections, onNavigate, projectTitle }: Props) {
  const [documents, setDocuments]   = useState(0)
  const [activities, setActivities] = useState<any[]>([])
  const [checklist, setChecklist]   = useState<ChecklistItem[]>([])
  const [drafts, setDrafts]         = useState<SectionDraft[]>([])
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const initRef = useRef<number | null>(null)

  // Literature search state
  const [litArticles, setLitArticles]   = useState<Article[]>([])
  const [litLoading, setLitLoading]     = useState(false)
  const [litQuery, setLitQuery]         = useState(projectTitle || '')
  const [litSavedIds, setLitSavedIds]   = useState<Set<string>>(new Set())
  const [litAddingId, setLitAddingId]   = useState<string | null>(null)
  const showLit = true
  const litDebounce = useRef<NodeJS.Timeout | null>(null)

  const editorSections = (manuscriptSections ?? []).filter(s => s !== 'Plagiarism Check')

  useEffect(() => {
    if (initRef.current === projectId) return
    initRef.current = projectId
    fetchAll()
  }, [projectId])

  useEffect(() => {
    if (showLit && projectTitle) {
      // Let AI extract the best PubMed search query from the title
      const mainTitle = projectTitle.split(/\s*[-:]\s*/)[0].trim()
      setLitQuery(mainTitle) // show title immediately while AI thinks
      fetchLiterature(mainTitle) // start search immediately
      // Async: refine with AI-extracted keywords
      ;(async () => {
        try {
          const { apiFetch } = await import('@/lib/api-fetch')
          const res = await apiFetch('/api/lit-query', {
            method: 'POST',
            body: JSON.stringify({ title: projectTitle }),
          })
          const data = await res.json()
          if (data?.query) {
            setLitQuery(data.query)
            fetchLiterature(data.query)
          }
        } catch {
          // fallback already running above
        }
      })()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLit, projectTitle])

  const fetchLiterature = async (q: string) => {
    if (!q.trim()) return
    setLitLoading(true)
    try {
      const res = await apiFetch(`/api/literature?q=${encodeURIComponent(q)}&max=10`)
      const data = await res.json()
      setLitArticles(data.articles || [])
    } catch { setLitArticles([]) }
    finally { setLitLoading(false) }
  }

  const handleLitSearch = (val: string) => {
    setLitQuery(val)
    if (litDebounce.current) clearTimeout(litDebounce.current)
    litDebounce.current = setTimeout(() => { if (val.trim()) fetchLiterature(val) }, 600)
  }

  const addToReferences = async (article: Article) => {
    setLitAddingId(article.id)
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) { setLitAddingId(null); return }
    const year = article.date ? article.date.split(' ')[0] : ''
    const volIssue = article.volume ? `${article.volume}${article.issue ? `(${article.issue})` : ''}` : ''
    const formatted = `${article.authors}. ${article.title}. ${article.journal}. ${year}${volIssue ? `;${volIssue}` : ''}${article.pages ? `:${article.pages}` : ''}${article.doi ? `. doi:${article.doi}` : ''}.`
    const citation = {
      id: `pm_${article.id}`,
      text: formatted,
      style: 'Vancouver',
      input: article.title,
      type: 'journal', authors: article.authors, title: article.title,
      journal: article.journal, year, doi: article.doi || '', url: article.url,
    }

    // Use explicit select → insert/update (same pattern as saveContent — proven to work with RLS)
    const { data: existing_row } = await supabase.from('project_sections')
      .select('id, content').eq('project_id', projectId).eq('user_id', user.id).eq('section', '__citations__').single()

    let existing: any[] = []
    try { existing = JSON.parse(existing_row?.content || '[]') } catch { existing = [] }
    const updated = [...existing.filter((c: any) => c.id !== citation.id), citation]

    if (existing_row?.id) {
      await supabase.from('project_sections')
        .update({ content: JSON.stringify(updated) })
        .eq('id', existing_row.id).eq('user_id', user.id)
    } else {
      await supabase.from('project_sections')
        .insert({ project_id: projectId, user_id: user.id, section: '__citations__', content: JSON.stringify(updated) })
    }
    setLitSavedIds(prev => new Set([...prev, article.id]))
    setLitAddingId(null)
  }

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


      {/* 2-col grid: Literature left + (Section Progress + Checklist + Activity) right — review types only */}
      {/* Non-review: Checklist + Activity side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>

        {/* LEFT: Literature (review types) OR Checklist (others) */}
        {showLit ? (
          <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 10, color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2px', fontWeight: 700 }}>✦ Suggested Literature</p>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f0e8d0', margin: 0 }}>PubMed · Semantic Scholar · Europe PMC</h3>
              </div>
              <span style={{ fontSize: 11, color: litLoading ? '#c9943a' : 'rgba(240,232,208,0.2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {litLoading ? 'Searching…' : litArticles.length > 0 ? `${litArticles.length} found` : ''}
              </span>
            </div>

            {/* Search bar */}
            <div style={{ padding: '12px 16px 0' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'rgba(240,232,208,0.2)', pointerEvents: 'none' }}>🔍</span>
                <input value={litQuery} onChange={e => handleLitSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') fetchLiterature(litQuery) }}
                  placeholder="Refine search…"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 32px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, color: '#f0e8d0', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.35)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>
            </div>

            {/* Skeleton */}
            {litLoading && (
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ height: 72, borderRadius: 10, background: 'rgba(255,255,255,0.03)', animation: 'litPulse 1.5s ease-in-out infinite', animationDelay: `${i*0.1}s` }} />
                ))}
              </div>
            )}

            {/* Articles */}
            {!litLoading && (
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
                {litArticles.length === 0 && (
                  <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.2)', textAlign: 'center', padding: '24px 0', margin: 0, fontStyle: 'italic' }}>No articles found — try different keywords</p>
                )}
                {litArticles.map(article => {
                  const saved = litSavedIds.has(article.id)
                  const adding = litAddingId === article.id
                  return (
                    <div key={article.id} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,148,58,0.2)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}>
                      {/* Title — clickable link to PubMed */}
                      <a href={article.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, fontWeight: 600, color: '#e8c878', textDecoration: 'underline', textDecorationColor: 'rgba(232,184,120,0.35)', lineHeight: 1.5, display: 'block', marginBottom: 4 }}>
                        {article.title}
                      </a>
                      {/* Authors + journal */}
                      <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.4)', margin: '0 0 4px', lineHeight: 1.4 }}>{article.authors}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 9 }}>
                        <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', fontStyle: 'italic' }}>{article.journal}</span>
                        {article.date && <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.22)' }}>· {article.date}</span>}
                        {article.pubtype && <span style={{ fontSize: 9, fontWeight: 700, color: '#60a5fa', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.15)', padding: '1px 5px', borderRadius: 5 }}>{article.pubtype.split(',')[0].trim()}</span>}
                        {(article as any).openAccess && <span style={{ fontSize: 9, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', padding: '1px 5px', borderRadius: 5 }}>Open Access</span>}
                        {(article as any).source && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5,
                            color: (article as any).source === 'pubmed' ? '#f59e0b' : (article as any).source === 'semantic_scholar' ? '#a78bfa' : '#38bdf8',
                            background: (article as any).source === 'pubmed' ? 'rgba(245,158,11,0.08)' : (article as any).source === 'semantic_scholar' ? 'rgba(167,139,250,0.08)' : 'rgba(56,189,248,0.08)',
                            border: `1px solid ${(article as any).source === 'pubmed' ? 'rgba(245,158,11,0.2)' : (article as any).source === 'semantic_scholar' ? 'rgba(167,139,250,0.2)' : 'rgba(56,189,248,0.2)'}`,
                          }}>
                            {(article as any).source === 'pubmed' ? 'PubMed' : (article as any).source === 'semantic_scholar' ? 'Semantic Scholar' : 'Europe PMC'}
                          </span>
                        )}
                      </div>
                      {/* Action row */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => !saved && addToReferences(article)} disabled={adding || saved}
                          style={{ padding: '4px 11px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: saved ? 'default' : 'pointer', fontFamily: 'inherit',
                            background: saved ? 'rgba(52,211,153,0.1)' : 'rgba(201,148,58,0.1)',
                            border: `1px solid ${saved ? 'rgba(52,211,153,0.25)' : 'rgba(201,148,58,0.25)'}`,
                            color: saved ? '#34d399' : '#c9943a' }}>
                          {saved ? '✓ Added to Refs' : adding ? 'Adding…' : '+ Add to References'}
                        </button>
                        <a href={article.url} target="_blank" rel="noopener noreferrer"
                          style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, color: 'rgba(96,165,250,0.8)', background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                          PubMed ↗
                        </a>
                        {article.doi && (
                          <a href={`https://doi.org/${article.doi}`} target="_blank" rel="noopener noreferrer"
                            style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, color: 'rgba(240,232,208,0.4)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                            DOI ↗
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* Activity feed for non-review types (left col) */
          <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>◎</div>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f0e8d0', margin: 0 }}>Recent Activity</h3>
                <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: 0 }}>Latest edits & events</p>
              </div>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activities.length === 0 ? (
                <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.2)', textAlign: 'center', padding: '16px 0', margin: 0, fontStyle: 'italic' }}>No activity yet — start writing!</p>
              ) : activities.map((a, i) => (
                <div key={a.id ?? `${a.created_at}-${i}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(201,148,58,0.5)', marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', margin: 0, lineHeight: 1.5 }}>{a.description || a.action || 'Updated project'}</p>
                    <p style={{ fontSize: 10, color: 'rgba(240,232,208,0.25)', margin: '2px 0 0' }}>{relTime(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RIGHT: Section Progress (review only) + Checklist (review only) + Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Activity feed */}
          <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>◎</div>
              <div>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: '#f0e8d0', margin: 0 }}>Recent Activity</h3>
                <p style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)', margin: 0 }}>Latest edits & events</p>
              </div>
            </div>
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activities.length === 0 ? (
                <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.2)', textAlign: 'center', padding: '16px 0', margin: 0, fontStyle: 'italic' }}>No activity yet — start writing!</p>
              ) : activities.map((a, i) => (
                <div key={a.id ?? `${a.created_at}-${i}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(201,148,58,0.5)', marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.6)', margin: 0, lineHeight: 1.5 }}>{a.description || a.action || 'Updated project'}</p>
                    <p style={{ fontSize: 10, color: 'rgba(240,232,208,0.25)', margin: '2px 0 0' }}>{relTime(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .overview-top { grid-template-columns: 1fr !important; }
          .overview-bottom { grid-template-columns: 1fr !important; }
        }
        @keyframes litPulse {
          0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
