'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  projectId: number
  currentJournal: string | null
  studyType: string
}

interface Journal {
  name: string
  openAccess: boolean
  impactFactor: string | null
  hIndex: number | null
  worksCount: number
  publisher: string | null
  url: string | null
  issn: string | null
  // for featured
  notes?: string
  wordLimit?: number
}

/* ── Featured hardcoded journals per study type ──────────────── */
const FEATURED: Journal[] = [
  { name: 'BMJ Case Reports',              openAccess: true,  impactFactor: '1.5', hIndex: null, worksCount: 0, publisher: 'BMJ',                  url: 'https://casereports.bmj.com',   issn: '1757-790X', notes: 'Largest case report journal. Requires patient consent form.',    wordLimit: 3000 },
  { name: 'Cureus',                        openAccess: true,  impactFactor: '1.3', hIndex: null, worksCount: 0, publisher: 'Springer',              url: 'https://www.cureus.com',        issn: '2168-8184', notes: 'Fast peer review. Good for first-time authors.',                 wordLimit: 4000 },
  { name: 'JAMA',                          openAccess: false, impactFactor: '157', hIndex: null, worksCount: 0, publisher: 'AMA',                   url: 'https://jamanetwork.com',       issn: '0098-7484', notes: 'Highly competitive. Requires structured abstract.',              wordLimit: 3000 },
  { name: 'NEJM',                          openAccess: false, impactFactor: '176', hIndex: null, worksCount: 0, publisher: 'Mass. Medical Society',  url: 'https://www.nejm.org',          issn: '0028-4793', notes: 'Most competitive medical journal. Rejection rate >90%.',         wordLimit: 3000 },
  { name: 'The Lancet',                    openAccess: false, impactFactor: '168', hIndex: null, worksCount: 0, publisher: 'Elsevier',               url: 'https://www.thelancet.com',     issn: '0140-6736', notes: 'High impact. Requires significant clinical relevance.',          wordLimit: 3000 },
  { name: 'BMJ Open',                      openAccess: true,  impactFactor: '2.9', hIndex: null, worksCount: 0, publisher: 'BMJ',                   url: 'https://bmjopen.bmj.com',       issn: '2044-6055', notes: 'Open access. More accessible than BMJ. Good for audits.',       wordLimit: 4000 },
  { name: 'PLOS ONE',                      openAccess: true,  impactFactor: '3.7', hIndex: null, worksCount: 0, publisher: 'PLOS',                  url: 'https://journals.plos.org',     issn: '1932-6203', notes: 'Judges scientific soundness, not impact.',                       wordLimit: 5000 },
  { name: 'Annals of Internal Medicine',   openAccess: false, impactFactor: '39',  hIndex: null, worksCount: 0, publisher: 'ACP',                   url: 'https://www.acpjournals.org',   issn: '0003-4819', notes: 'High prestige. Strong clinical practice preference.',            wordLimit: 3500 },
  { name: 'Journal of Medical Case Reports', openAccess: true, impactFactor: '0.9', hIndex: null, worksCount: 0, publisher: 'BioMed Central',       url: 'https://jmedicalcasereports.com', issn: '1752-1947', notes: 'Dedicated case report journal. Good for beginners.',           wordLimit: 3500 },
  { name: 'Postgraduate Medical Journal',  openAccess: false, impactFactor: '3.0', hIndex: null, worksCount: 0, publisher: 'BMJ',                   url: 'https://pmj.bmj.com',           issn: '0032-5473', notes: 'Ideal for residents and postgraduate doctors.',                 wordLimit: 3000 },
  { name: 'European Journal of Case Reports in Internal Medicine', openAccess: true, impactFactor: '1.2', hIndex: null, worksCount: 0, publisher: 'ESGENA', url: null, issn: '2284-2594', notes: 'European case report journal. Rapid review.',                  wordLimit: 2500 },
  { name: 'American Journal of Case Reports', openAccess: true, impactFactor: '1.4', hIndex: null, worksCount: 0, publisher: 'Int. Scientific Information', url: 'https://amjcaserep.com', issn: '1941-5923', notes: 'Open access. Broad medical scope.',                            wordLimit: 3000 },
]

const STUDY_TYPE_MAP: Record<string, string[]> = {
  'Case Report':      ['BMJ Case Reports', 'Cureus', 'Journal of Medical Case Reports', 'American Journal of Case Reports', 'European Journal of Case Reports in Internal Medicine', 'Postgraduate Medical Journal'],
  'Case Series':      ['BMJ Case Reports', 'Cureus', 'Journal of Medical Case Reports', 'American Journal of Case Reports'],
  'Original Study':   ['JAMA', 'NEJM', 'The Lancet', 'BMJ Open', 'PLOS ONE', 'Annals of Internal Medicine'],
  'Review Article':   ['JAMA', 'Annals of Internal Medicine', 'Postgraduate Medical Journal', 'PLOS ONE'],
  'Systematic Review':['JAMA', 'The Lancet', 'BMJ Open', 'PLOS ONE', 'Annals of Internal Medicine'],
  'Meta-Analysis':    ['JAMA', 'The Lancet', 'PLOS ONE', 'Annals of Internal Medicine'],
  'Thesis':           ['PLOS ONE', 'BMJ Open', 'Cureus'],
  'Audit':            ['BMJ Open', 'Postgraduate Medical Journal', 'Cureus'],
  'Letter to Editor': ['NEJM', 'JAMA', 'The Lancet', 'Postgraduate Medical Journal'],
}

function IFBadge({ value }: { value: string | null }) {
  if (!value) return null
  const n = parseFloat(value)
  const color = n >= 50 ? '#f59e0b' : n >= 10 ? '#c9943a' : n >= 3 ? '#60a5fa' : 'rgba(240,232,208,0.4)'
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}30`, padding: '2px 7px', borderRadius: 20 }}>
      IF {value}
    </span>
  )
}

function JournalCard({ journal, selected, onSelect, showTypes }: {
  journal: Journal
  selected: boolean
  onSelect: () => void
  showTypes?: boolean
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 12,
        background: selected ? 'rgba(201,148,58,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? 'rgba(201,148,58,0.45)' : 'rgba(255,255,255,0.07)'}`,
        cursor: 'pointer', transition: 'all 0.15s',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(201,148,58,0.25)' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: selected ? '#e8c878' : '#f0e8d0' }}>{journal.name}</span>
          {selected && <span style={{ fontSize: 9, fontWeight: 700, color: '#c9943a', background: 'rgba(201,148,58,0.12)', border: '1px solid rgba(201,148,58,0.3)', padding: '1px 7px', borderRadius: 20 }}>SELECTED</span>}
        </div>
        {journal.notes && <p style={{ fontSize: 11.5, color: 'rgba(240,232,208,0.4)', margin: '0 0 4px', lineHeight: 1.5 }}>{journal.notes}</p>}
        {journal.publisher && !journal.notes && <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: '0 0 4px' }}>{journal.publisher}</p>}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          <IFBadge value={journal.impactFactor} />
          {journal.openAccess && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#34d399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', padding: '2px 7px', borderRadius: 20 }}>Open Access</span>
          )}
          {journal.wordLimit && (
            <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 20 }}>{journal.wordLimit.toLocaleString()} words</span>
          )}
          {journal.worksCount > 0 && (
            <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.25)', padding: '2px 0' }}>{(journal.worksCount / 1000).toFixed(0)}K papers</span>
          )}
        </div>
      </div>
      {journal.url && (
        <a
          href={journal.url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', flexShrink: 0, paddingTop: 2, textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#c9943a')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,148,58,0.5)')}
        >↗</a>
      )}
    </button>
  )
}

export default function JournalSelector({ projectId, currentJournal, studyType }: Props) {
  const [selected, setSelected] = useState<string | null>(currentJournal)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Journal[]>([])
  const [searchError, setSearchError] = useState('')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const recommended = FEATURED.filter(j => (STUDY_TYPE_MAP[studyType] || []).includes(j.name))
  const others = FEATURED.filter(j => !(STUDY_TYPE_MAP[studyType] || []).includes(j.name))

  // Debounced live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setSearchResults([]); setSearchError(''); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true); setSearchError('')
      try {
        const res = await fetch(`/api/journals?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (data.error) { setSearchError(data.error); setSearchResults([]) }
        else setSearchResults(data.results || [])
      } catch { setSearchError('Search failed') }
      finally { setSearching(false) }
    }, 400)
  }, [query])

  const saveJournal = async (journalName: string) => {
    setSaving(true); setSelected(journalName)
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (user) await supabase.from('projects').update({ target_journal: journalName }).eq('id', projectId).eq('user_id', user.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const selectedMeta = [...FEATURED, ...searchResults].find(j => j.name === selected)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#f0e8d0', letterSpacing: '-0.4px', margin: '0 0 4px' }}>Journal Selector</h2>
          <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0 }}>Search 30,000+ indexed medical journals via OpenAlex</p>
        </div>
        {saving && <span style={{ fontSize: 12, color: '#c9943a' }}>Saving…</span>}
        {saved && <span style={{ fontSize: 12, color: '#34d399' }}>✓ Saved</span>}
      </div>

      {/* Selected journal banner */}
      {selected && selectedMeta && (
        <div style={{ padding: '16px 18px', borderRadius: 14, background: 'rgba(201,148,58,0.08)', border: '1px solid rgba(201,148,58,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#c9943a', letterSpacing: '0.1em' }}>TARGET JOURNAL</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#e8c878', margin: '0 0 6px' }}>{selectedMeta.name}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <IFBadge value={selectedMeta.impactFactor} />
                {selectedMeta.openAccess && <span style={{ fontSize: 10, fontWeight: 600, color: '#34d399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', padding: '2px 7px', borderRadius: 20 }}>Open Access</span>}
                {selectedMeta.wordLimit && <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.4)', padding: '2px 0' }}>{selectedMeta.wordLimit.toLocaleString()} word limit</span>}
              </div>
            </div>
            <button onClick={async () => { setSelected(null); const { data: { session } } = await supabase.auth.getSession(); const user = session?.user; if (user) supabase.from('projects').update({ target_journal: null }).eq('id', projectId).eq('user_id', user.id) }}
              style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'rgba(201,148,58,0.5)', pointerEvents: 'none' }}>⌕</span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by journal name, specialty, or keyword…"
          style={{
            width: '100%', padding: '12px 14px 12px 38px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, fontSize: 14, color: '#f0e8d0', outline: 'none',
            fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.45)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        {searching && (
          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(201,148,58,0.15)', borderTopColor: '#c9943a', animation: 'spin 0.8s linear infinite' }}/>
        )}
        {query && !searching && (
          <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(240,232,208,0.3)', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>×</button>
        )}
      </div>

      {/* Live search results */}
      {query.trim() && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
            {searching ? 'Searching OpenAlex…' : searchError ? searchError : `${searchResults.length} results for "${query}"`}
          </p>
          {searchResults.map(j => (
            <JournalCard key={j.issn || j.name} journal={j} selected={selected === j.name} onSelect={() => saveJournal(j.name)} />
          ))}
          {!searching && !searchError && searchResults.length === 0 && (
            <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.25)', textAlign: 'center', padding: '20px 0' }}>No journals found. Try different keywords.</p>
          )}
        </div>
      )}

      {/* Featured: Recommended */}
      {!query.trim() && recommended.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#34d399', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
            ✓ Recommended for {studyType}
          </p>
          {recommended.map(j => (
            <JournalCard key={j.name} journal={j} selected={selected === j.name} onSelect={() => saveJournal(j.name)} />
          ))}
        </div>
      )}

      {/* Featured: Others */}
      {!query.trim() && others.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,232,208,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
            Other Featured Journals
          </p>
          {others.map(j => (
            <JournalCard key={j.name} journal={j} selected={selected === j.name} onSelect={() => saveJournal(j.name)} />
          ))}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
