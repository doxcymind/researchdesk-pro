'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Submission {
  id: number
  journal_name: string
  submitted_at: string
  status: string
  notes: string
}

interface Props {
  projectId: number
  projectTitle?: string
}

const STATUS_OPTIONS = ['Submitted', 'Under Review', 'Revision Requested', 'Accepted', 'Rejected']

const STATUS_META: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  'Submitted':          { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)',  dot: '#60a5fa' },
  'Under Review':       { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)',  dot: '#fbbf24' },
  'Revision Requested': { color: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)',  dot: '#f97316' },
  'Accepted':           { color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)',  dot: '#34d399' },
  'Rejected':           { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', dot: '#f87171' },
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function RejectionTracker({ projectId, projectTitle }: Props) {
  const [submissions, setSubmissions]   = useState<Submission[]>([])
  const [targetJournal, setTargetJournal] = useState<string>('')
  const [showForm, setShowForm]         = useState(false)
  const [saving, setSaving]             = useState(false)

  // Pre-filled form state — auto-populated from project data
  const [journalName, setJournalName]   = useState('')
  const [submittedAt, setSubmittedAt]   = useState(today())
  const [status, setStatus]             = useState('Submitted')
  const [notes, setNotes]               = useState('')

  useEffect(() => {
    fetchAll()
  }, [projectId])

  const fetchAll = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return

    // Load target journal
    const { data: journalRow } = await supabase
      .from('project_sections').select('content')
      .eq('project_id', projectId).eq('user_id', user.id).eq('section', '__target_journal__').single()
    const journal = journalRow?.content || ''
    setTargetJournal(journal)

    // Load submissions
    const { data } = await supabase
      .from('journal_submissions').select('*')
      .eq('project_id', projectId).order('submitted_at', { ascending: false })
    if (data) setSubmissions(data)
  }

  const openForm = () => {
    // Auto-fill everything we know
    setJournalName(targetJournal)
    setSubmittedAt(today())
    setStatus('Submitted')
    setNotes(projectTitle ? `Submitted "${projectTitle}"${targetJournal ? ` to ${targetJournal}` : ''}.` : '')
    setShowForm(true)
  }

  const saveSubmission = async () => {
    if (!journalName) return
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) { setSaving(false); return }

    await supabase.from('journal_submissions').insert({
      project_id: projectId, user_id: user.id,
      journal_name: journalName, submitted_at: submittedAt, status, notes,
    })
    setShowForm(false)
    setSaving(false)
    await fetchAll()
  }

  const updateStatus = async (id: number, newStatus: string) => {
    await supabase.from('journal_submissions').update({ status: newStatus }).eq('id', id)
    fetchAll()
  }

  const deleteSubmission = async (id: number) => {
    await supabase.from('journal_submissions').delete().eq('id', id)
    fetchAll()
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 10, padding: '10px 14px', color: '#f0e8d0', fontSize: 13, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: 'clamp(16px,3vw,28px)', fontFamily: "var(--font-inter),'DM Sans',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16 }}>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px', fontWeight: 700 }}>✦ Publishing Tools</p>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f0e8d0', margin: '0 0 5px', fontFamily: "var(--font-cinzel),'Cormorant Garamond',Georgia,serif" }}>Submission Tracker</h2>
          <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.35)', margin: 0 }}>Track every journal submission — status, dates, and reviewer notes in one place.</p>
        </div>
        {!showForm && (
          <button onClick={openForm}
            style={{ padding: '9px 18px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0, background: 'linear-gradient(135deg,rgba(201,148,58,0.2),rgba(201,148,58,0.1))', border: '1px solid rgba(201,148,58,0.3)', color: '#c9943a' }}>
            + Log Submission
          </button>
        )}
      </div>

      {/* Auto-filled confirmation form */}
      {showForm && (
        <div style={{ background: 'rgba(201,148,58,0.05)', border: '1px solid rgba(201,148,58,0.25)', borderRadius: 16, padding: '20px 22px', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(201,148,58,0.7)', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              ✦ Auto-filled from your project
            </p>
            <button onClick={() => setShowForm(false)} style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>✕ Cancel</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Journal */}
            <div>
              <label style={{ fontSize: 10, color: 'rgba(240,232,208,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6, fontWeight: 600 }}>
                Journal
                {targetJournal && journalName === targetJournal && (
                  <span style={{ marginLeft: 8, fontSize: 9, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', padding: '1px 6px', borderRadius: 8, fontWeight: 700, textTransform: 'none', letterSpacing: 0 }}>from Journal Selector</span>
                )}
              </label>
              <input value={journalName} onChange={e => setJournalName(e.target.value)} style={inp}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')} />
            </div>

            {/* Date + Status row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: 'rgba(240,232,208,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6, fontWeight: 600 }}>
                  Date Submitted
                  <span style={{ marginLeft: 8, fontSize: 9, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', padding: '1px 6px', borderRadius: 8, fontWeight: 700, textTransform: 'none', letterSpacing: 0 }}>today</span>
                </label>
                <input type="date" value={submittedAt} onChange={e => setSubmittedAt(e.target.value)}
                  style={{ ...inp, colorScheme: 'dark' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'rgba(240,232,208,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6, fontWeight: 600 }}>Status</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 4 }}>
                  {STATUS_OPTIONS.map(s => {
                    const m = STATUS_META[s]
                    const active = status === s
                    return (
                      <button key={s} onClick={() => setStatus(s)}
                        style={{ padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', background: active ? m.bg : 'transparent', border: `1px solid ${active ? m.border : 'rgba(255,255,255,0.08)'}`, color: active ? m.color : 'rgba(240,232,208,0.3)' }}>
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Notes — auto-generated */}
            <div>
              <label style={{ fontSize: 10, color: 'rgba(240,232,208,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6, fontWeight: 600 }}>
                Notes
                <span style={{ marginLeft: 8, fontSize: 9, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', padding: '1px 6px', borderRadius: 8, fontWeight: 700, textTransform: 'none', letterSpacing: 0 }}>auto-generated</span>
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                style={{ ...inp, resize: 'none', lineHeight: 1.6 }}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')} />
            </div>

            <button onClick={saveSubmission} disabled={saving || !journalName}
              style={{ padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg,#c9943a,#e8b84a)', border: 'none', color: '#080c18', fontSize: 13, fontWeight: 800, cursor: saving || !journalName ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving || !journalName ? 0.6 : 1 }}>
              {saving ? 'Saving…' : '✓ Confirm & Save Submission'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {submissions.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(240,232,208,0.2)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px', color: 'rgba(240,232,208,0.3)' }}>No submissions yet</p>
          <p style={{ fontSize: 13, margin: '0 0 20px' }}>
            {targetJournal
              ? <>Ready to submit to <span style={{ color: '#c9943a' }}>{targetJournal}</span>? Log it in one click.</>
              : 'Click "+ Log Submission" when you submit your manuscript.'}
          </p>
          {targetJournal && (
            <button onClick={openForm}
              style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,rgba(201,148,58,0.2),rgba(201,148,58,0.1))', border: '1px solid rgba(201,148,58,0.3)', color: '#c9943a', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Log submission to {targetJournal}
            </button>
          )}
        </div>
      )}

      {/* Submission cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {submissions.map(sub => {
          const m = STATUS_META[sub.status] ?? STATUS_META['Submitted']
          return (
            <div key={sub.id} style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${m.border}`, borderRadius: 16, padding: '18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f0e8d0', margin: '0 0 4px' }}>{sub.journal_name}</h3>
                  <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.3)', margin: 0 }}>Submitted {fmtDate(sub.submitted_at)}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: m.bg, border: `1px solid ${m.border}`, color: m.color, whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: m.dot, marginRight: 6, verticalAlign: 'middle' }} />
                    {sub.status}
                  </span>
                  <button onClick={() => deleteSubmission(sub.id)}
                    style={{ fontSize: 11, color: 'rgba(248,113,113,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: 6, transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.35)')}>✕</button>
                </div>
              </div>

              {sub.notes && (
                <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.4)', margin: '0 0 12px', lineHeight: 1.6, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>{sub.notes}</p>
              )}

              {/* Status update buttons */}
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {STATUS_OPTIONS.map(s => {
                  const sm = STATUS_META[s]
                  const active = sub.status === s
                  return (
                    <button key={s} onClick={() => updateStatus(sub.id, s)}
                      style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', background: active ? sm.bg : 'transparent', border: `1px solid ${active ? sm.border : 'rgba(255,255,255,0.07)'}`, color: active ? sm.color : 'rgba(240,232,208,0.25)' }}>
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
