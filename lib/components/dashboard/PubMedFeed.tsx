'use client'

import { useEffect, useState } from 'react'

interface Article {
  id: string
  title: string
  authors: string
  journal: string
  date: string
  url: string
  pubtype: string
}

const TYPE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  'Clinical Trial':              { label: 'Clinical Trial',    color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  'Randomized Controlled Trial': { label: 'RCT',               color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  'Systematic Review':           { label: 'Systematic Review', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  'Meta-Analysis':               { label: 'Meta-Analysis',     color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
  'Review':                      { label: 'Review',            color: '#c9943a', bg: 'rgba(201,148,58,0.1)'  },
}

function getBadge(pubtype: string) {
  for (const [key, val] of Object.entries(TYPE_BADGE)) {
    if (pubtype.includes(key)) return val
  }
  return { label: 'Journal Article', color: 'rgba(240,232,208,0.45)', bg: 'rgba(255,255,255,0.05)' }
}

function timeAgo(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return 'Today'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export default function PubMedFeed() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading]   = useState(true)
  const [hovered, setHovered]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/pubmed')
      .then(r => r.json())
      .then(d => setArticles(d.articles || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ marginTop: 40 }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399', animation: 'pubmedPulse 2s ease-in-out infinite' }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f0e8d0', margin: 0, fontFamily: "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif" }}>
              Latest from PubMed
            </h2>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.25)', margin: '4px 0 0 16px' }}>
            Live feed · High-impact recent publications
          </p>
        </div>
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/"
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', textDecoration: 'none', letterSpacing: '0.04em', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#c9943a')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,148,58,0.5)')}
        >
          Open PubMed →
        </a>
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="skel" style={{ height: 72, borderRadius: 14, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(240,232,208,0.2)', fontSize: 13, borderRadius: 14, border: '1px dashed rgba(255,255,255,0.06)' }}>
          Could not load articles. <a href="https://pubmed.ncbi.nlm.nih.gov/" target="_blank" rel="noreferrer" style={{ color: '#c9943a' }}>Browse PubMed directly →</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {articles.map((a, i) => {
            const badge = getBadge(a.pubtype)
            const isHovered = hovered === a.id
            return (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                onMouseEnter={() => setHovered(a.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '14px 16px', borderRadius: 14, textDecoration: 'none',
                  background: isHovered ? 'rgba(201,148,58,0.05)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isHovered ? 'rgba(201,148,58,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.18s',
                  animation: `fadeInUp 0.35s ${i * 0.04}s both`,
                }}
              >
                {/* Index */}
                <span style={{
                  fontSize: 11, color: 'rgba(201,148,58,0.3)', fontWeight: 700,
                  fontFamily: "'Courier New', monospace", minWidth: 20, paddingTop: 2, flexShrink: 0,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 500, color: isHovered ? '#f0e8d0' : 'rgba(240,232,208,0.75)',
                    margin: '0 0 6px', lineHeight: 1.45,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    transition: 'color 0.18s',
                  }}>
                    {a.title}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                      {a.authors}
                    </span>
                    {a.journal && (
                      <>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.1)' }}>·</span>
                        <span style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                          {a.journal}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right meta */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                    background: badge.bg, color: badge.color, whiteSpace: 'nowrap',
                  }}>
                    {badge.label}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.2)', whiteSpace: 'nowrap' }}>
                    {timeAgo(a.date)}
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes pubmedPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
