'use client'

import { useEffect, useState, useRef } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import { supabase } from '@/lib/supabase'

interface Article {
  id: string
  title: string
  authors: string
  journal: string
  date: string
  doi: string | null
  url: string
  pubtype: string
  volume: string
  issue: string
  pages: string
  source?: 'pubmed' | 'semantic_scholar' | 'europe_pmc'
  openAccess?: boolean
  pdfUrl?: string | null
}

interface Props {
  projectId: number
  projectTitle: string
  studyType: string
}

export default function LiteratureSearch({ projectId, projectTitle, studyType }: Props) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState(projectTitle)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [addingId, setAddingId] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const debounce = useRef<NodeJS.Timeout | null>(null)

  // Auto-search on mount and when projectTitle changes (e.g. after rename)
  useEffect(() => {
    if (projectTitle) {
      const shortQ = projectTitle.split(/\s*[-:]\s*/)[0].trim().split(/\s+/).slice(0, 8).join(' ')
      setQuery(shortQ)
      search(shortQ)
    }
  }, [projectTitle])

  const search = async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await apiFetch(`/api/literature?q=${encodeURIComponent(q)}&max=10`)
      const data = await res.json()
      setArticles(data.articles || [])
    } catch {
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  const handleQueryChange = (val: string) => {
    setQuery(val)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => { if (val.trim()) search(val) }, 600)
  }

  const addToReferences = async (article: Article) => {
    setAddingId(article.id)
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) { setAddingId(null); return }

    // Build Vancouver-style citation
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

    // Explicit select → insert/update (same RLS-safe pattern as saveContent)
    const { data: existing_row } = await supabase.from('project_sections')
      .select('id, content').eq('project_id', projectId).eq('user_id', user.id).eq('section', '__citations__').single()

    let existing: object[] = []
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

    setSavedIds(prev => new Set([...prev, article.id]))
    setAddingId(null)
  }

  return (
    <div style={{ padding: 'clamp(16px,3vw,28px)', fontFamily: "var(--font-inter),'DM Sans',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px', fontWeight: 700 }}>✦ Literature</p>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f0e8d0', margin: '0 0 5px', fontFamily: "var(--font-cinzel),'Cormorant Garamond',Georgia,serif" }}>Literature Search</h2>
        <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.35)', margin: 0 }}>
          PubMed articles relevant to your {studyType.toLowerCase()}. Add any to your References with one click.
        </p>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'rgba(240,232,208,0.25)', pointerEvents: 'none' }}>🔍</span>
        <input
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          placeholder="Search PubMed…"
          style={{
            width: '100%', boxSizing: 'border-box', padding: '11px 14px 11px 38px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 10, color: '#f0e8d0', fontSize: 13, outline: 'none', fontFamily: 'inherit',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
          onKeyDown={e => { if (e.key === 'Enter') search(query) }}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'rgba(240,232,208,0.3)' }}>Searching…</span>
        )}
      </div>

      {/* Results count */}
      {!loading && searched && (
        <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: '0 0 16px', letterSpacing: '0.05em' }}>
          {articles.length > 0 ? `${articles.length} articles found` : 'No results — try different keywords'}
        </p>
      )}

      {/* Article cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {articles.map(article => {
          const saved = savedIds.has(article.id)
          const adding = addingId === article.id
          return (
            <div key={article.id} style={{
              background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '16px 18px',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,148,58,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            >
              {/* Title */}
              <a href={article.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, fontWeight: 600, color: '#e8c878', textDecoration: 'none', lineHeight: 1.5, display: 'block', marginBottom: 6 }}
                onMouseEnter={e => ((e.target as HTMLElement).style.textDecoration = 'underline')}
                onMouseLeave={e => ((e.target as HTMLElement).style.textDecoration = 'none')}
              >
                {article.title}
              </a>

              {/* Authors + meta */}
              <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.45)', margin: '0 0 4px', lineHeight: 1.5 }}>{article.authors}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', fontStyle: 'italic' }}>{article.journal}</span>
                {article.date && <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.25)' }}>· {article.date}</span>}
                {article.pubtype && <span style={{ fontSize: 9, fontWeight: 700, color: '#60a5fa', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', padding: '1px 6px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{article.pubtype.split(',')[0].trim()}</span>}
                {article.openAccess && <span style={{ fontSize: 9, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', padding: '1px 6px', borderRadius: 8 }}>Open Access</span>}
                {article.source && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                    color: article.source === 'pubmed' ? '#f59e0b' : article.source === 'semantic_scholar' ? '#a78bfa' : '#38bdf8',
                    background: article.source === 'pubmed' ? 'rgba(245,158,11,0.08)' : article.source === 'semantic_scholar' ? 'rgba(167,139,250,0.08)' : 'rgba(56,189,248,0.08)',
                    border: `1px solid ${article.source === 'pubmed' ? 'rgba(245,158,11,0.2)' : article.source === 'semantic_scholar' ? 'rgba(167,139,250,0.2)' : 'rgba(56,189,248,0.2)'}`,
                  }}>
                    {article.source === 'pubmed' ? 'PubMed' : article.source === 'semantic_scholar' ? 'Semantic Scholar' : 'Europe PMC'}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => !saved && addToReferences(article)}
                  disabled={adding || saved}
                  style={{
                    padding: '5px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    cursor: saved ? 'default' : adding ? 'wait' : 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                    background: saved ? 'rgba(52,211,153,0.1)' : 'rgba(201,148,58,0.12)',
                    border: `1px solid ${saved ? 'rgba(52,211,153,0.3)' : 'rgba(201,148,58,0.3)'}`,
                    color: saved ? '#34d399' : '#c9943a',
                  }}
                >
                  {saved ? '✓ Added to References' : adding ? 'Adding…' : '+ Add to References'}
                </button>
                {article.doi && (
                  <a href={`https://doi.org/${article.doi}`} target="_blank" rel="noopener noreferrer"
                    style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: 'rgba(240,232,208,0.35)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    DOI ↗
                  </a>
                )}
                {article.pdfUrl && (
                  <a href={article.pdfUrl} target="_blank" rel="noopener noreferrer"
                    style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#34d399', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    PDF ↗
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty loading state */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: 100, borderRadius: 14, background: 'rgba(255,255,255,0.03)', animation: 'litPulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes litPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
