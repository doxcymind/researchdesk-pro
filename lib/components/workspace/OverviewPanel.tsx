'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props { projectId: number; studyType?: string }
interface ChecklistItem { id: string; item: string; completed: boolean }

const CHECKLIST_BY_TYPE: Record<string, string[]> = {
  'Case Report':       ['Abstract completed', 'Introduction completed', 'Case Presentation completed', 'Discussion completed', 'Conclusion completed', 'References added', 'Images ready for publication', 'Ethics approval attached'],
  'Case Series':       ['Abstract completed', 'Introduction completed', 'Case Presentations completed', 'Discussion completed', 'Conclusion completed', 'References added', 'Images ready for publication', 'Ethics approval attached'],
  'Original Study':    ['Abstract completed', 'Introduction completed', 'Methods completed', 'Results completed', 'Discussion completed', 'Conclusion completed', 'References added', 'Images ready for publication', 'Ethics approval attached'],
  'Review Article':    ['Abstract completed', 'Introduction completed', 'Search strategy defined', 'Results completed', 'Discussion completed', 'Conclusion completed', 'References added', 'Images ready for publication'],
  'Systematic Review': ['Abstract completed', 'Introduction completed', 'PRISMA checklist done', 'Methods completed', 'Results completed', 'Discussion completed', 'References added', 'Images ready for publication'],
  'Meta-Analysis':     ['Abstract completed', 'Introduction completed', 'Methods completed', 'Statistical analysis done', 'Results completed', 'Discussion completed', 'References added', 'Images ready for publication'],
  'Thesis':            ['Abstract completed', 'Introduction completed', 'Literature Review completed', 'Methods completed', 'Results completed', 'Discussion completed', 'Conclusion completed', 'References added', 'Images ready for publication', 'IEC approval obtained'],
  'Letter to Editor':  ['Abstract completed', 'Body completed', 'References added', 'Word count verified'],
  'Audit':             ['Abstract completed', 'Introduction completed', 'Methods completed', 'Results completed', 'Discussion completed', 'Recommendations completed', 'References added', 'Images ready for publication'],
}

const DEFAULT_CHECKLIST = [
  'Abstract completed', 'Introduction completed', 'Methods completed',
  'Results completed', 'Discussion completed', 'References added', 'Ethics approval attached',
]

const SECTION_META: Record<string, { icon: string; label: string }> = {
  'Abstract completed':           { icon: '✦', label: 'Abstract' },
  'Introduction completed':       { icon: '⬡', label: 'Introduction' },
  'Methods completed':            { icon: '⚙', label: 'Methods' },
  'Results completed':            { icon: '◉', label: 'Results' },
  'Discussion completed':         { icon: '◎', label: 'Discussion' },
  'Conclusion completed':         { icon: '◈', label: 'Conclusion' },
  'References added':             { icon: '⊞', label: 'References' },
  'Ethics approval attached':     { icon: '⚖', label: 'Ethics' },
  'Images ready for publication': { icon: '🖼', label: 'Images' },
  'IEC approval obtained':        { icon: '⚖', label: 'IEC' },
  'Case Presentation completed':  { icon: '📋', label: 'Case' },
  'Case Presentations completed': { icon: '📋', label: 'Cases' },
  'Literature Review completed':  { icon: '📖', label: 'Lit Review' },
  'Search strategy defined':      { icon: '🔍', label: 'Search' },
  'PRISMA checklist done':        { icon: '✦', label: 'PRISMA' },
  'Statistical analysis done':    { icon: '📊', label: 'Stats' },
  'Body completed':               { icon: '✦', label: 'Body' },
  'Word count verified':          { icon: '◎', label: 'Words' },
  'Recommendations completed':    { icon: '◈', label: 'Recs' },
}

export default function OverviewPanel({ projectId, studyType }: Props) {
  const [documents, setDocuments]         = useState(0)
  const [drafts, setDrafts]               = useState(0)
  const [checksCompleted, setChecksCompleted] = useState(0)
  const [totalChecks, setTotalChecks]     = useState(0)
  const [activities, setActivities]       = useState<any[]>([])
  const [checklist, setChecklist]         = useState<ChecklistItem[]>([])
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    ;(async () => {
      await initializeChecklist()
      await fetchDashboardData()
    })()
  }, [projectId])

  const initializeChecklist = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: allRows } = await supabase
      .from('publication_checks').select('id, item').eq('project_id', projectId).eq('user_id', user.id).order('id', { ascending: true })
    if (allRows && allRows.length > 0) {
      const seen = new Set<string>(); const toDelete: string[] = []
      for (const row of allRows) { if (seen.has(row.item)) toDelete.push(row.id); else seen.add(row.item) }
      if (toDelete.length) await supabase.from('publication_checks').delete().in('id', toDelete).eq('user_id', user.id)
      return
    }
    const defaults: string[] = (studyType && CHECKLIST_BY_TYPE[studyType]) ? CHECKLIST_BY_TYPE[studyType] : DEFAULT_CHECKLIST
    await supabase.from('publication_checks').insert(
      defaults.map(item => ({ project_id: projectId, user_id: user.id, item, completed: false }))
    )
  }

  const fetchDashboardData = async () => {
    const [{ count: docsCount }, { count: draftsCount }, { data: checks }, { data: activityData }] = await Promise.all([
      supabase.from('uploads').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
      supabase.from('project_sections').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
      supabase.from('publication_checks').select('*').eq('project_id', projectId),
      supabase.from('activity_logs').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(5),
    ])
    const seen = new Set<string>()
    const unique = (checks || []).filter((c: ChecklistItem) => { if (seen.has(c.item)) return false; seen.add(c.item); return true })
    setDocuments(docsCount || 0); setDrafts(draftsCount || 0)
    setChecklist(unique)
    const comp = unique.filter((c: ChecklistItem) => c.completed).length
    setChecksCompleted(comp); setTotalChecks(unique.length)
    setActivities(activityData || [])
  }

  const toggleItem = async (id: string, current: boolean) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('publication_checks').update({ completed: !current }).eq('id', id).eq('user_id', user.id)
    fetchDashboardData()
  }

  const progress = totalChecks > 0 ? Math.round((checksCompleted / totalChecks) * 100) : 0

  useEffect(() => {
    const t = setTimeout(() => setAnimatedProgress(progress), 400)
    return () => clearTimeout(t)
  }, [progress])

  const R = 68; const CIRC = 2 * Math.PI * R
  const dash = (animatedProgress / 100) * CIRC

  const scoreColor  = progress >= 75 ? '#34d399' : progress >= 40 ? '#e8c97a' : 'rgba(200,192,175,0.75)'
  const scoreLabel  = progress >= 75 ? 'Publication Ready' : progress >= 40 ? 'In Progress' : 'Early Draft'

  const relTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="overview-root" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── ROYAL HERO CARD ────────────────────────────────── */}
      <div style={{
        position: 'relative', borderRadius: 24, overflow: 'hidden',
        background: 'linear-gradient(135deg, #0d1426 0%, #080c18 50%, #0a0f1e 100%)',
        border: '1px solid rgba(201,148,58,0.35)',
        boxShadow: '0 0 60px rgba(201,148,58,0.07), inset 0 1px 0 rgba(201,148,58,0.15)',
        padding: '36px 36px 32px',
      }} className="overview-hero-card">
        {/* corner ornaments */}
        <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} width={80} height={80} viewBox="0 0 80 80">
          <path d="M0 0 L30 0 L0 30 Z" fill="rgba(201,148,58,0.06)" />
          <path d="M2 2 L22 2 M2 2 L2 22" stroke="rgba(201,148,58,0.3)" strokeWidth="1" fill="none" />
        </svg>
        <svg style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none' }} width={80} height={80} viewBox="0 0 80 80">
          <path d="M80 0 L50 0 L80 30 Z" fill="rgba(201,148,58,0.06)" />
          <path d="M78 2 L58 2 M78 2 L78 22" stroke="rgba(201,148,58,0.3)" strokeWidth="1" fill="none" />
        </svg>
        <svg style={{ position: 'absolute', bottom: 0, left: 0, pointerEvents: 'none' }} width={80} height={80} viewBox="0 0 80 80">
          <path d="M0 80 L30 80 L0 50 Z" fill="rgba(201,148,58,0.06)" />
          <path d="M2 78 L22 78 M2 78 L2 58" stroke="rgba(201,148,58,0.3)" strokeWidth="1" fill="none" />
        </svg>
        <svg style={{ position: 'absolute', bottom: 0, right: 0, pointerEvents: 'none' }} width={80} height={80} viewBox="0 0 80 80">
          <path d="M80 80 L50 80 L80 50 Z" fill="rgba(201,148,58,0.06)" />
          <path d="M78 78 L58 78 M78 78 L78 58" stroke="rgba(201,148,58,0.3)" strokeWidth="1" fill="none" />
        </svg>

        {/* radial bg glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 300, background: 'radial-gradient(ellipse, rgba(201,148,58,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="overview-hero-row" style={{ display: 'flex', alignItems: 'center', gap: 40, position: 'relative', zIndex: 1 }}>

          {/* Ring */}
          <div className="overview-ring" style={{ position: 'relative', flexShrink: 0 }}>
            {/* outer glow ring */}
            <div style={{
              position: 'absolute', inset: -8, borderRadius: '50%',
              background: `conic-gradient(${scoreColor}22 ${animatedProgress * 3.6}deg, transparent ${animatedProgress * 3.6}deg)`,
              transition: 'background 1s ease', filter: 'blur(8px)',
            }} />
            <svg width={160} height={160} viewBox="0 0 160 160">
              {/* tick marks */}
              {Array.from({ length: 36 }).map((_, i) => {
                const angle = (i * 10 - 90) * (Math.PI / 180)
                const r1 = 76, r2 = i % 3 === 0 ? 70 : 73
                return (
                  <line key={i}
                    x1={80 + r1 * Math.cos(angle)} y1={80 + r1 * Math.sin(angle)}
                    x2={80 + r2 * Math.cos(angle)} y2={80 + r2 * Math.sin(angle)}
                    stroke="rgba(201,148,58,0.2)" strokeWidth={i % 3 === 0 ? 1.5 : 0.8}
                  />
                )
              })}
              {/* base track */}
              <circle cx={80} cy={80} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={12} />
              {/* coloured arc */}
              <circle cx={80} cy={80} r={R}
                fill="none"
                stroke={`url(#scoreGrad)`}
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${CIRC}`}
                transform="rotate(-90 80 80)"
                style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                filter="url(#glow)"
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={scoreColor} stopOpacity="0.7" />
                  <stop offset="100%" stopColor={scoreColor} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {/* inner decorative ring */}
              <circle cx={80} cy={80} r={52} fill="none" stroke="rgba(201,148,58,0.08)" strokeWidth={1} strokeDasharray="3 5" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <span style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(201,148,58,0.55)', textTransform: 'uppercase' }}>Score</span>
              <span style={{ fontSize: 38, fontWeight: 900, color: scoreColor, lineHeight: 1, letterSpacing: '-1px', textShadow: `0 0 20px ${scoreColor}66` }}>{progress}</span>
              <span style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(201,148,58,0.4)', textTransform: 'uppercase' }}>/ 100</span>
            </div>
          </div>

          {/* Text */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.22em', color: 'rgba(201,148,58,0.6)', textTransform: 'uppercase', margin: '0 0 10px', fontFamily: 'var(--font-inter), DM Sans, sans-serif' }}>Publication Readiness</p>
            <h2 style={{ fontSize: 36, fontWeight: 600, color: '#f0e8d0', margin: '0 0 6px', letterSpacing: '0.01em', lineHeight: 1.1, fontFamily: 'var(--font-cinzel), Cormorant Garamond, Georgia, serif' }}>{scoreLabel}</h2>
            <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.4)', margin: '0 0 22px' }}>
              {checksCompleted} of {totalChecks} milestones complete
            </p>

            {/* mini stat row */}
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'Uploads', val: documents, color: '#c9943a' },
                { label: 'Drafts',  val: drafts,    color: '#a78bfa' },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, textAlign: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12, padding: '12px 8px',
                }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.val}</p>
                  <p style={{ fontSize: 10, color: 'rgba(240,232,208,0.35)', margin: '5px 0 0', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* progress stripe bar */}
        <div style={{ marginTop: 28, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: totalChecks || 7 }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 5, borderRadius: 3,
                background: i < checksCompleted
                  ? `linear-gradient(90deg, ${scoreColor}cc, ${scoreColor})`
                  : 'rgba(255,255,255,0.07)',
                transition: 'background 0.5s',
                boxShadow: i < checksCompleted ? `0 0 8px ${scoreColor}55` : 'none',
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── CHECKLIST ───────────────────────────────────────── */}
      <div style={{
        borderRadius: 20,
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(201,148,58,0.15)',
        overflow: 'hidden',
      }}>
        {/* header */}
        <div style={{
          padding: '20px 24px 18px',
          borderBottom: '1px solid rgba(201,148,58,0.1)',
          background: 'linear-gradient(90deg, rgba(201,148,58,0.05) 0%, transparent 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(201,148,58,0.12)', border: '1px solid rgba(201,148,58,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: '#c9943a',
            }}>✦</div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f0e8d0', margin: 0, letterSpacing: '-0.2px' }}>Publication Checklist</h3>
              <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: 0 }}>Manuscript completion milestones</p>
            </div>
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
            padding: '5px 14px', borderRadius: 20,
            background: checksCompleted === totalChecks && totalChecks > 0 ? 'rgba(52,211,153,0.12)' : 'rgba(201,148,58,0.08)',
            border: `1px solid ${checksCompleted === totalChecks && totalChecks > 0 ? 'rgba(52,211,153,0.3)' : 'rgba(201,148,58,0.2)'}`,
            color: checksCompleted === totalChecks && totalChecks > 0 ? '#34d399' : '#c9943a',
          }}>
            {checksCompleted === totalChecks && totalChecks > 0 ? '✓ Complete' : `${checksCompleted} / ${totalChecks}`}
          </div>
        </div>

        {/* items */}
        <div className="overview-checklist-grid" style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {checklist.map((item) => {
            const meta = SECTION_META[item.item] || { icon: '·', label: item.item }
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleItem(item.id, item.completed)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 16px', borderRadius: 12, cursor: 'pointer',
                  background: item.completed
                    ? 'linear-gradient(90deg, rgba(52,211,153,0.08), rgba(52,211,153,0.03))'
                    : 'rgba(255,255,255,0.02)',
                  border: item.completed
                    ? '1px solid rgba(52,211,153,0.22)'
                    : '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.22s', textAlign: 'left',
                  outline: 'none', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (!item.completed) { (e.currentTarget as HTMLElement).style.background = 'rgba(201,148,58,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,148,58,0.2)' } }}
                onMouseLeave={e => { if (!item.completed) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)' } }}
              >
                {/* checkbox */}
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: item.completed ? 'linear-gradient(135deg, #34d399 0%, #059669 100%)' : 'transparent',
                  border: item.completed ? 'none' : '1.5px solid rgba(201,148,58,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: item.completed ? '0 0 14px rgba(52,211,153,0.35)' : 'none',
                  transition: 'all 0.22s',
                }}>
                  {item.completed && <span style={{ fontSize: 11, color: '#fff', fontWeight: 900 }}>✓</span>}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: item.completed ? 'rgba(52,211,153,0.5)' : 'rgba(201,148,58,0.5)', flexShrink: 0 }}>{meta.icon}</span>
                    <span style={{
                      fontSize: 12.5, fontWeight: 500,
                      color: item.completed ? 'rgba(240,232,208,0.28)' : 'rgba(240,232,208,0.72)',
                      textDecoration: item.completed ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      transition: 'color 0.22s',
                    }}>{item.item}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── ACTIVITY FEED ───────────────────────────────────── */}
      <div style={{
        borderRadius: 20,
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden',
      }}>
        {/* header */}
        <div style={{
          padding: '20px 24px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: 'rgba(240,232,208,0.4)',
            }}>◎</div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f0e8d0', margin: 0 }}>Activity Log</h3>
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

        <div style={{ padding: '10px 14px 12px' }}>
          {activities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.2)', fontStyle: 'italic', margin: 0 }}>No activity yet — start writing to see your timeline</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activities.map((a, i) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 10px', borderRadius: 10, background: i === 0 ? 'rgba(201,148,58,0.04)' : 'transparent', marginBottom: 2 }}>
                  {/* icon */}
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: i === 0 ? 'rgba(201,148,58,0.12)' : 'rgba(255,255,255,0.03)',
                    border: i === 0 ? '1px solid rgba(201,148,58,0.22)' : '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: i === 0 ? '#c9943a' : 'rgba(240,232,208,0.3)',
                  }}>
                    {a.action.startsWith('Saved') ? '💾' : a.action.startsWith('Generated') ? '✦' : a.action.startsWith('AI') ? '◉' : a.action.startsWith('Upload') ? '↑' : '·'}
                  </div>

                  <span style={{
                    flex: 1, fontSize: 13,
                    color: i === 0 ? 'rgba(240,232,208,0.8)' : 'rgba(240,232,208,0.45)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{a.action}</span>

                  <span style={{
                    fontSize: 10.5, color: 'rgba(240,232,208,0.22)',
                    whiteSpace: 'nowrap',
                    background: 'rgba(255,255,255,0.04)',
                    padding: '3px 9px', borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>{relTime(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    <style>{`
      @media (max-width: 768px) {
        .overview-root { gap: 28px !important; }
        .overview-hero-card { padding: 24px 20px 22px !important; }
        .overview-hero-row { flex-direction: column !important; align-items: center !important; gap: 20px !important; }
        .overview-checklist-grid { grid-template-columns: 1fr !important; gap: 10px !important; padding: 16px !important; }
        .overview-checklist-grid button { padding: 16px 18px !important; border-radius: 14px !important; font-size: 14px !important; }
        .overview-checklist-grid button span:last-child { font-size: 14px !important; }
      }
    `}</style>
    </div>
  )
}
