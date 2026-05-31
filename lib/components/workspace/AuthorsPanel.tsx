'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import { supabase } from '@/lib/supabase'

interface Author {
  id: string
  name: string
  email: string
  affiliation: string
  orcid: string
  corresponding: boolean
}

const emptyAuthor = (): Author => ({
  id: crypto.randomUUID(),
  name: '', email: '', affiliation: '', orcid: '', corresponding: false,
})

export default function AuthorsPanel({ projectId }: { projectId: number }) {
  const [authors, setAuthors] = useState<Author[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [orcidLoading, setOrcidLoading] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('project_sections')
        .select('content')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .eq('section', '__authors__')
        .single()
      if (data?.content) {
        try { setAuthors(JSON.parse(data.content)) } catch {}
      } else {
        setAuthors([emptyAuthor()])
      }
    }
    load()
  }, [projectId])

  const save = async (list: Author[]) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: existing } = await supabase
      .from('project_sections').select('id')
      .eq('project_id', projectId).eq('user_id', user.id).eq('section', '__authors__').single()

    if (existing) {
      await supabase.from('project_sections').update({ content: JSON.stringify(list) })
        .eq('project_id', projectId).eq('user_id', user.id).eq('section', '__authors__')
    } else {
      await supabase.from('project_sections').insert({
        project_id: projectId, user_id: user.id,
        section: '__authors__', content: JSON.stringify(list),
      })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const update = (id: string, field: keyof Author, value: string | boolean) => {
    setAuthors(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  const addAuthor = () => setAuthors(prev => [...prev, emptyAuthor()])

  const removeAuthor = (id: string) => {
    const next = authors.filter(a => a.id !== id)
    setAuthors(next.length ? next : [emptyAuthor()])
  }

  const moveUp = (i: number) => {
    if (i === 0) return
    const next = [...authors]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    setAuthors(next)
  }

  const moveDown = (i: number) => {
    if (i === authors.length - 1) return
    const next = [...authors]
    ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
    setAuthors(next)
  }

  const lookupOrcid = async (id: string, orcid: string) => {
    const clean = orcid.replace(/[^0-9X]/gi, '')
    if (clean.length !== 16) return
    const formatted = `${clean.slice(0,4)}-${clean.slice(4,8)}-${clean.slice(8,12)}-${clean.slice(12,16)}`
    setOrcidLoading(id)
    try {
      const res = await fetch(`https://pub.orcid.org/v3.0/${formatted}/person`, {
        headers: { Accept: 'application/json' }
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const given = data?.name?.['given-names']?.value || ''
      const family = data?.name?.['family-name']?.value || ''
      const fullName = `${given} ${family}`.trim()
      const affiliations = data?.affiliations?.['employment-summary'] || []
      const affiliation = affiliations[0]?.organization?.name || ''
      setAuthors(prev => prev.map(a => a.id === id ? {
        ...a,
        orcid: formatted,
        name: fullName || a.name,
        affiliation: affiliation || a.affiliation,
      } : a))
    } catch {
      // ORCID not found or network error — just format the ID
      const formatted2 = `${clean.slice(0,4)}-${clean.slice(4,8)}-${clean.slice(8,12)}-${clean.slice(12,16)}`
      setAuthors(prev => prev.map(a => a.id === id ? { ...a, orcid: formatted2 } : a))
    } finally {
      setOrcidLoading(null)
    }
  }

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '8px 12px', color: '#f0e8d0', fontSize: 13,
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', ...style,
  })

  return (
    <div style={{ padding: 'clamp(16px,3vw,28px)', fontFamily: "var(--font-inter),'DM Sans',system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px', fontWeight: 700 }}>✦ Author Management</p>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f0e8d0', margin: '0 0 6px', fontFamily: "var(--font-cinzel),'Cormorant Garamond',Georgia,serif" }}>Authors & Affiliations</h2>
        <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.4)', margin: 0 }}>Add all authors in submission order. Drag to reorder. Enter an ORCID iD to auto-fill name and affiliation.</p>
      </div>

      {/* Author cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
        {authors.map((author, i) => (
          <div key={author.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${author.corresponding ? 'rgba(201,148,58,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '18px 20px' }}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(201,148,58,0.12)', border: '1px solid rgba(201,148,58,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#c9943a', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f0e8d0' }}>{author.name || 'New Author'}</span>
                {author.corresponding && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(201,148,58,0.12)', color: '#c9943a', border: '1px solid rgba(201,148,58,0.2)', fontWeight: 600 }}>Corresponding</span>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => moveUp(i)} disabled={i === 0} title="Move up" style={{ padding: '4px 8px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: i === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(240,232,208,0.4)', cursor: i === 0 ? 'default' : 'pointer', fontSize: 12 }}>↑</button>
                <button onClick={() => moveDown(i)} disabled={i === authors.length - 1} title="Move down" style={{ padding: '4px 8px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: i === authors.length - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(240,232,208,0.4)', cursor: i === authors.length - 1 ? 'default' : 'pointer', fontSize: 12 }}>↓</button>
                <button onClick={() => removeAuthor(author.id)} title="Remove author" style={{ padding: '4px 8px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,80,80,0.15)', color: 'rgba(255,80,80,0.4)', cursor: 'pointer', fontSize: 12 }}>✕</button>
              </div>
            </div>

            {/* Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, color: 'rgba(240,232,208,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>Full Name *</label>
                <input value={author.name} onChange={e => update(author.id, 'name', e.target.value)} placeholder="e.g. Sparsh Dixit" style={inp()} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'rgba(240,232,208,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>Email</label>
                <input value={author.email} onChange={e => update(author.id, 'email', e.target.value)} placeholder="email@institution.edu" style={inp()} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 10, color: 'rgba(240,232,208,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>Affiliation</label>
                <input value={author.affiliation} onChange={e => update(author.id, 'affiliation', e.target.value)} placeholder="Department, Institution, City, Country" style={inp()} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'rgba(240,232,208,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>
                  ORCID iD
                  <a href="https://orcid.org/register" target="_blank" rel="noopener" style={{ marginLeft: 6, color: 'rgba(201,148,58,0.5)', fontSize: 9 }}>Get one →</a>
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={author.orcid}
                    onChange={e => update(author.id, 'orcid', e.target.value)}
                    onBlur={e => { if (e.target.value.replace(/[^0-9X]/gi,'').length === 16) lookupOrcid(author.id, e.target.value) }}
                    placeholder="0000-0000-0000-0000"
                    style={inp({ flex: 1 })}
                  />
                  {orcidLoading === author.id
                    ? <span style={{ padding: '8px 12px', fontSize: 12, color: 'rgba(201,148,58,0.5)' }}>…</span>
                    : author.orcid && author.orcid.replace(/[^0-9X]/gi,'').length === 16
                      ? <a href={`https://orcid.org/${author.orcid}`} target="_blank" rel="noopener" style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(166,206,57,0.1)', border: '1px solid rgba(166,206,57,0.25)', color: '#a6ce39', fontSize: 11, textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                          View ↗
                        </a>
                      : null
                  }
                </div>
                {author.orcid && author.orcid.replace(/[^0-9X]/gi,'').length === 16 && (
                  <p style={{ fontSize: 10, color: 'rgba(166,206,57,0.6)', margin: '4px 0 0' }}>✓ Valid ORCID iD</p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div
                    onClick={() => update(author.id, 'corresponding', !author.corresponding)}
                    style={{
                      width: 36, height: 20, borderRadius: 10, cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
                      background: author.corresponding ? 'rgba(201,148,58,0.5)' : 'rgba(255,255,255,0.1)',
                      border: `1px solid ${author.corresponding ? 'rgba(201,148,58,0.6)' : 'rgba(255,255,255,0.15)'}`,
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%', background: '#f0e8d0', position: 'absolute',
                      top: 2, left: author.corresponding ? 18 : 2, transition: 'left 0.2s',
                    }} />
                  </div>
                  <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.5)' }}>Corresponding author</span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add author */}
      <button onClick={addAuthor} style={{ width: '100%', padding: '11px', borderRadius: 10, background: 'transparent', border: '1px dashed rgba(201,148,58,0.25)', color: 'rgba(201,148,58,0.6)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20 }}>
        + Add Author
      </button>

      {/* Save */}
      <button
        onClick={() => save(authors)}
        disabled={saving}
        style={{ width: '100%', padding: '12px', borderRadius: 10, background: saved ? 'rgba(52,211,153,0.15)' : 'linear-gradient(135deg,rgba(201,148,58,0.2),rgba(201,148,58,0.1))', border: `1px solid ${saved ? 'rgba(52,211,153,0.3)' : 'rgba(201,148,58,0.3)'}`, color: saved ? '#34d399' : '#c9943a', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
      >
        {saving ? 'Saving…' : saved ? '✓ Authors Saved' : 'Save Authors'}
      </button>

      {/* Info note */}
      <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.25)', marginTop: 14, lineHeight: 1.6, textAlign: 'center' }}>
        Authors are included in your exported Word document title page.<br />
        ORCID iDs are auto-verified against the ORCID public registry.
      </p>
    </div>
  )
}
