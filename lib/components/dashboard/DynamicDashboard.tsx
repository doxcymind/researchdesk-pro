'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const inter  = "var(--font-inter),'DM Sans',system-ui,sans-serif"
const cinzel = "var(--font-cinzel),'Cormorant Garamond',Georgia,serif"

const MANUSCRIPT_SECTIONS: Record<string, string[]> = {
  'Case Report':       ['Abstract', 'Introduction', 'Case Presentation', 'Discussion', 'Conclusion', 'References'],
  'Case Series':       ['Abstract', 'Introduction', 'Case Presentations', 'Discussion', 'Conclusion', 'References'],
  'Original Study':    ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References'],
  'Review Article':    ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References'],
  'Systematic Review': ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References'],
  'Meta-Analysis':     ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References'],
  'Thesis':            ['Abstract', 'Introduction', 'Literature Review', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References'],
  'Letter to Editor':  ['Abstract', 'Body', 'References'],
  'Audit':             ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'Recommendations', 'References'],
}
const DEFAULT_SECTIONS = ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'References']

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

/* ── Writing streak helpers ── */
function getTodayKey() {
  return new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
}

function getStreak(): number {
  try {
    const raw = localStorage.getItem('rd_streak')
    if (!raw) return 0
    const { streak, lastDate } = JSON.parse(raw)
    const today = getTodayKey()
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    if (lastDate === today || lastDate === yesterday) return streak
    return 0 // streak broken
  } catch { return 0 }
}

export function bumpStreak() {
  try {
    const today = getTodayKey()
    const raw = localStorage.getItem('rd_streak')
    if (raw) {
      const { streak, lastDate } = JSON.parse(raw)
      if (lastDate === today) return // already bumped today
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const newStreak = lastDate === yesterday ? streak + 1 : 1
      localStorage.setItem('rd_streak', JSON.stringify({ streak: newStreak, lastDate: today }))
    } else {
      localStorage.setItem('rd_streak', JSON.stringify({ streak: 1, lastDate: today }))
    }
  } catch {}
}

interface RecentItem {
  action: string
  projectTitle: string
  projectId: number
  createdAt: string
}

interface ProjectProgress {
  id: number
  title: string
  studyType: string
  written: number
  total: number
}

export default function DynamicDashboard({ projects }: { projects: any[] }) {
  const [recent, setRecent]     = useState<RecentItem | null>(null)
  const [progress, setProgress] = useState<ProjectProgress[]>([])
  const [streak, setStreak]     = useState(0)
  const [loaded, setLoaded]     = useState(false)

  useEffect(() => {
    setStreak(getStreak())
    load()
  }, [projects])

  const load = async () => {
    try {
      if (!projects.length) { setLoaded(true); return }
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { setLoaded(true); return }

      const projectIds = projects.map(p => p.id)

      // Fire both queries in parallel
      const [logsRes, sectionsRes] = await Promise.all([
        supabase.from('activity_logs').select('action, project_id, created_at').in('project_id', projectIds).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('project_sections').select('project_id, section, content').in('project_id', projectIds).eq('user_id', user.id),
      ])

      if (logsRes.data?.[0]) {
        const proj = projects.find(p => p.id === logsRes.data![0].project_id)
        setRecent({
          action: logsRes.data[0].action,
          projectTitle: proj?.title || 'Project',
          projectId: logsRes.data[0].project_id,
          createdAt: logsRes.data[0].created_at,
        })
      }

      const sections = sectionsRes.data || []
      const progressData: ProjectProgress[] = projects.map(p => {
        const expected = MANUSCRIPT_SECTIONS[p.study_type] ?? DEFAULT_SECTIONS
        const written = sections.filter(s =>
          s.project_id === p.id &&
          expected.includes(s.section) &&
          s.content && s.content.trim().length > 10
        ).length
        return { id: p.id, title: p.title, studyType: p.study_type, written, total: expected.length }
      })
      setProgress(progressData)
    } catch (err) {
      console.error('DynamicDashboard load error:', err)
    } finally {
      setLoaded(true)
    }
  }

  if (!loaded) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32, fontFamily: inter }}>

      {/* ── Row: Streak + Recent Activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>

        {/* Streak card */}
        <div style={{
          padding: '20px 22px', borderRadius: 16,
          background: streak > 0
            ? 'linear-gradient(135deg, rgba(251,146,60,0.1), rgba(251,191,36,0.06))'
            : 'rgba(255,255,255,0.02)',
          border: streak > 0 ? '1px solid rgba(251,146,60,0.25)' : '1px solid rgba(255,255,255,0.06)',
          position: 'relative', overflow: 'hidden',
        }}>
          {streak > 0 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(251,146,60,0.6), transparent)' }} />}
          <div style={{ fontSize: 28, marginBottom: 6 }}>{streak > 0 ? '🔥' : '💤'}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: streak > 0 ? '#fb923c' : 'rgba(240,232,208,0.2)', fontFamily: cinzel, lineHeight: 1 }}>
            {streak}
          </div>
          <div style={{ fontSize: 11, color: streak > 0 ? 'rgba(251,146,60,0.7)' : 'rgba(240,232,208,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginTop: 4 }}>
            Day Streak
          </div>
          <div style={{ fontSize: 11, color: 'rgba(240,232,208,0.25)', marginTop: 6, lineHeight: 1.5 }}>
            {streak === 0 ? 'Write today to start your streak' : streak === 1 ? 'Keep going — write again tomorrow!' : `${streak} consecutive days of writing`}
          </div>
        </div>

        {/* Recent activity card */}
        <div style={{
          padding: '20px 22px', borderRadius: 16,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 12 }}>
            ⟳ &nbsp;Last Activity
          </div>
          {recent ? (
            <>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#f0e8d0', margin: '0 0 4px' }}>{recent.action}</p>
                <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0, textTransform: 'capitalize' }}>{recent.projectTitle}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.2)' }}>{relTime(recent.createdAt)}</span>
                <Link href={`/workspace/${recent.projectId}`} style={{
                  fontSize: 11, fontWeight: 700, color: '#c9943a', textDecoration: 'none',
                  padding: '5px 14px', borderRadius: 8,
                  background: 'rgba(201,148,58,0.08)', border: '1px solid rgba(201,148,58,0.2)',
                  transition: 'all 0.18s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,148,58,0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201,148,58,0.08)')}
                >Continue →</Link>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.2)', margin: 0 }}>No activity yet — open a project and start writing.</p>
          )}
        </div>
      </div>

      {/* ── Project progress bars ── */}
      {progress.length > 0 && (
        <div style={{
          padding: '20px 22px', borderRadius: 16,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 16 }}>
            ◎ &nbsp;Manuscript Progress
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {progress.map(p => {
              const pct = Math.round((p.written / p.total) * 100)
              const color = pct >= 75 ? '#34d399' : pct >= 40 ? '#c9943a' : '#a78bfa'
              return (
                <Link key={p.id} href={`/workspace/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ transition: 'opacity 0.18s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#f0e8d0', textTransform: 'capitalize' }}>
                        <span style={{ color, marginRight: 7, fontSize: 11 }}>◎</span>{p.title}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)' }}>{p.written}/{p.total} sections</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color }}>{pct}%</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 99,
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${color}99, ${color})`,
                        transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                        boxShadow: `0 0 8px ${color}55`,
                      }} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
