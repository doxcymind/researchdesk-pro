'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api-fetch'

interface Props {
  projectId: number
  projectTitle: string
  studyType: string
}

export default function CoverLetterPanel({ projectId, projectTitle, studyType }: Props) {
  const [summary, setSummary] = useState('')
  const [letter, setLetter] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [targetJournal, setTargetJournal] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Load saved letter + journal
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const [letterRow, journalRow] = await Promise.all([
        supabase.from('project_sections').select('content')
          .eq('project_id', projectId).eq('user_id', user.id).eq('section', '__cover_letter__').single(),
        supabase.from('project_sections').select('content')
          .eq('project_id', projectId).eq('user_id', user.id).eq('section', '__target_journal__').single(),
      ])

      if (letterRow.data?.content) setLetter(letterRow.data.content)
      if (journalRow.data?.content) setTargetJournal(journalRow.data.content)
    }
    load()
  }, [projectId])

  const generate = async () => {
    setGenerating(true)
    try {
      const res = await apiFetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, projectTitle, studyType, summary }),
      })
      const data = await res.json()
      if (data.letter) {
        setLetter(data.letter)
      }
    } catch (e) {
      console.error('Cover letter generate error:', e)
    } finally {
      setGenerating(false)
    }
  }

  const saveLetter = async () => {
    if (!letter) return
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (user) {
      await supabase.from('project_sections').upsert(
        { project_id: projectId, user_id: user.id, section: '__cover_letter__', content: letter },
        { onConflict: 'project_id,user_id,section' }
      )
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const copyLetter = async () => {
    await navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const s = (extra?: React.CSSProperties): React.CSSProperties => ({
    fontFamily: "var(--font-inter),'DM Sans',system-ui,sans-serif",
    ...extra,
  })

  return (
    <div style={s({ padding: 'clamp(16px,3vw,28px)' })}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px', fontWeight: 700 }}>✦ Publishing Tools</p>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f0e8d0', margin: '0 0 6px', fontFamily: "var(--font-cinzel),'Cormorant Garamond',Georgia,serif" }}>Cover Letter Generator</h2>
        <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.4)', margin: 0, lineHeight: 1.5 }}>
          AI-generated cover letter using your manuscript title, authors, and target journal.
          {targetJournal && <> Targeting: <span style={{ color: '#c9943a' }}>{targetJournal}</span>.</>}
        </p>
      </div>

      {/* Summary input */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: 'rgba(240,232,208,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8, fontWeight: 600 }}>
          Key Findings / Summary <span style={{ color: 'rgba(240,232,208,0.2)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — helps personalise the letter)</span>
        </label>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="e.g. We report a rare case of X in a Y-year-old patient. The key finding was Z, which has implications for clinical practice because..."
          rows={4}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 10, padding: '10px 14px', color: '#f0e8d0', fontSize: 13, resize: 'vertical',
            fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6,
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
        />
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={generating}
        style={{
          width: '100%', padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 700,
          cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginBottom: 24,
          background: generating ? 'rgba(201,148,58,0.08)' : 'linear-gradient(135deg,rgba(201,148,58,0.2),rgba(201,148,58,0.1))',
          border: '1px solid rgba(201,148,58,0.3)', color: '#c9943a',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {generating ? (
          <>
            <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(201,148,58,0.2)', borderTopColor: '#c9943a', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
            Generating Cover Letter…
          </>
        ) : (
          letter ? '↻ Regenerate Cover Letter' : '✦ Generate Cover Letter'
        )}
      </button>

      {/* Letter output */}
      {letter && (
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(201,148,58,0.2)', borderRadius: 14, overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(201,148,58,0.04)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cover Letter</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={copyLetter}
                style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: copied ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)'}`, color: copied ? '#34d399' : 'rgba(240,232,208,0.5)' }}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button
                onClick={saveLetter}
                disabled={saving}
                style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', background: saved ? 'rgba(52,211,153,0.12)' : 'rgba(201,148,58,0.1)', border: `1px solid ${saved ? 'rgba(52,211,153,0.3)' : 'rgba(201,148,58,0.25)'}`, color: saved ? '#34d399' : '#c9943a' }}
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </div>

          {/* Editable letter */}
          <textarea
            value={letter}
            onChange={e => setLetter(e.target.value)}
            style={{
              width: '100%', background: 'transparent', border: 'none', padding: '20px 24px',
              color: '#f0e8d0', fontSize: 13, lineHeight: 1.9, resize: 'vertical', minHeight: 420,
              fontFamily: "'Georgia', 'Times New Roman', serif", outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
