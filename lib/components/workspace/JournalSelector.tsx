'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api-fetch'
import SubmissionChecklist from './SubmissionChecklist'

interface Props {
  projectId: number
  currentJournal: string | null
  studyType: string
  onNavigate?: (section: string) => void
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

/* ── Author Guidelines per journal ──────────────────────────── */
interface JournalGuidelines {
  wordLimit: number
  abstractLimit: number
  referenceLimit: number
  figures: string
  fee: string
  requiredSections: string[]
  turnaround: string
  format: string
  specialNotes: string
}

const JOURNAL_GUIDELINES: Record<string, JournalGuidelines> = {
  'BMJ Case Reports': {
    wordLimit: 3000, abstractLimit: 150, referenceLimit: 30, figures: 'Up to 5 figures/tables. TIFF/EPS ≥300 dpi.',
    fee: '£1,770 APC (waiver available)', requiredSections: ['Abstract (Background, Case Presentation, Conclusion)', 'Introduction', 'Case Presentation', 'Discussion', 'Patient Perspective', 'Learning Points'],
    turnaround: '4–6 weeks', format: 'Vancouver', specialNotes: 'Patient consent form mandatory. Ethics statement required. Learning points section (3 bullet points) required.',
  },
  'Cureus': {
    wordLimit: 4000, abstractLimit: 250, referenceLimit: 50, figures: 'Unlimited. PNG/JPEG ≥300 dpi.',
    fee: '$150–$500 APC (tiered peer review)', requiredSections: ['Abstract', 'Introduction', 'Case Presentation / Methods', 'Results / Discussion', 'Conclusions'],
    turnaround: '1–3 weeks', format: 'AMA', specialNotes: 'Uses Scholarly Impact Quotient (SIQ). Good for first-time authors. Open-access only.',
  },
  'PLOS ONE': {
    wordLimit: 5000, abstractLimit: 300, referenceLimit: 100, figures: 'Up to 15. TIFF/EPS ≥300 dpi.',
    fee: '$1,955 APC', requiredSections: ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'Supporting Information'],
    turnaround: '5–8 weeks', format: 'Vancouver', specialNotes: 'Data availability statement mandatory. Judges scientific soundness only, not perceived impact.',
  },
  'BMJ Open': {
    wordLimit: 4000, abstractLimit: 300, referenceLimit: 60, figures: 'Up to 8. TIFF/EPS ≥300 dpi.',
    fee: '£2,000 APC', requiredSections: ['Abstract (Objectives, Design, Setting, Participants, Outcome Measures, Results, Conclusions)', 'Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion'],
    turnaround: '4–8 weeks', format: 'Vancouver', specialNotes: 'CONSORT/STROBE checklist required. Structured abstract mandatory.',
  },
  'JAMA': {
    wordLimit: 3000, abstractLimit: 350, referenceLimit: 40, figures: 'Up to 6. EPS/TIFF ≥300 dpi.',
    fee: 'No APC (subscription)', requiredSections: ['Structured Abstract (Importance, Objective, Design, Setting, Participants, Interventions, Main Outcomes, Results, Conclusions)', 'Introduction', 'Methods', 'Results', 'Discussion'],
    turnaround: '4–6 weeks (if not rejected immediately)', format: 'AMA', specialNotes: 'Rejection rate >90%. Must have a clear clinical practice implication. Statistical analysis plan required.',
  },
  'NEJM': {
    wordLimit: 3000, abstractLimit: 200, referenceLimit: 40, figures: 'Up to 6.',
    fee: 'No APC (subscription)', requiredSections: ['Abstract (unstructured)', 'Introduction', 'Methods', 'Results', 'Discussion'],
    turnaround: '2–4 weeks', format: 'Vancouver', specialNotes: 'Rejection rate >90%. All authors must disclose conflicts. Statistical review required for clinical trials.',
  },
  'Journal of Medical Case Reports': {
    wordLimit: 3500, abstractLimit: 200, referenceLimit: 30, figures: 'Up to 5.',
    fee: '£1,690 APC', requiredSections: ['Abstract (Introduction, Case Presentation, Conclusion)', 'Introduction', 'Case Presentation', 'Discussion', 'Conclusions'],
    turnaround: '4–8 weeks', format: 'Vancouver', specialNotes: 'Patient consent mandatory. CARE checklist required.',
  },
  'American Journal of Case Reports': {
    wordLimit: 3000, abstractLimit: 200, referenceLimit: 30, figures: 'Up to 5.',
    fee: '$350 APC', requiredSections: ['Abstract', 'Background', 'Case Report', 'Discussion', 'Conclusions'],
    turnaround: '4–6 weeks', format: 'Vancouver', specialNotes: 'CARE checklist recommended. Broad medical scope.',
  },
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

export default function JournalSelector({ projectId, currentJournal, studyType, onNavigate }: Props) {
  const [selected, setSelected] = useState<string | null>(currentJournal)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Journal[]>([])
  const [searchError, setSearchError] = useState('')
  const [showGuidelines, setShowGuidelines] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [popupJournal, setPopupJournal] = useState('')
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
        const res = await apiFetch(`/api/journals?q=${encodeURIComponent(query)}`)
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
    if (user) {
      // Save to projects table (if column exists)
      await supabase.from('projects').update({ target_journal: journalName }).eq('id', projectId).eq('user_id', user.id)
      // Also save to project_sections as guaranteed fallback
      await supabase.from('project_sections').upsert(
        { project_id: projectId, user_id: user.id, section: '__target_journal__', content: journalName },
        { onConflict: 'project_id,user_id,section' }
      )
    }
    setSaving(false); setSaved(true)
    setPopupJournal(journalName)
    setShowPopup(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const selectedMeta = [...FEATURED, ...searchResults].find(j => j.name === selected)
  const selectedGuidelines = selected ? JOURNAL_GUIDELINES[selected] ?? null : null

  const popupMeta = JOURNAL_GUIDELINES[popupJournal] ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Journal customisation popup */}
      {showPopup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,8,15,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowPopup(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 'min(480px, 90vw)', background: 'linear-gradient(160deg,#0e1525,#080c18)', border: '1px solid rgba(52,211,153,0.35)', borderRadius: 20, padding: '32px 28px', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(52,211,153,0.08)' }}>

            {/* Icon + headline */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>✦</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#34d399', margin: '0 0 8px', fontFamily: "var(--font-cinzel),'Cormorant Garamond',Georgia,serif" }}>Manuscript Customised</h3>
              <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.55)', margin: 0, lineHeight: 1.6 }}>
                Your workspace has been restructured to match the submission requirements of
              </p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#e8c878', margin: '6px 0 0' }}>{popupJournal}</p>
            </div>

            {/* What changed */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(201,148,58,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px' }}>What changed</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[
                  { icon: '◈', label: 'Manuscript sections', detail: popupMeta ? `${popupMeta.requiredSections.length} required sections applied` : 'Updated to journal format' },
                  { icon: '⬡', label: 'Word limits', detail: popupMeta ? `${popupMeta.wordLimit.toLocaleString()} words total · Abstract ≤ ${popupMeta.abstractLimit}` : 'Per-section limits applied' },
                  { icon: '📎', label: 'References', detail: popupMeta ? `≤ ${popupMeta.referenceLimit} references · ${popupMeta.format} format` : 'Citation format updated' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 13, width: 18, textAlign: 'center', flexShrink: 0, opacity: 0.6, marginTop: 1 }}>{item.icon}</span>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#f0e8d0' }}>{item.label}</span>
                      <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.4)', marginLeft: 6 }}>{item.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', textAlign: 'center', margin: '0 0 18px', lineHeight: 1.6 }}>
              Your existing content is preserved. Only the section structure and limits have been updated.
            </p>

            <button onClick={() => setShowPopup(false)}
              style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg,rgba(52,211,153,0.2),rgba(52,211,153,0.1))', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Got it — let&apos;s write
            </button>
          </div>
        </div>
      )}

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
          {/* Author Guidelines toggle */}
          {selectedGuidelines && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(201,148,58,0.12)' }}>
              <button
                onClick={() => setShowGuidelines(g => !g)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(240,232,208,0.5)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}
              >
                <span style={{ fontSize: 11, color: '#c9943a' }}>📋</span>
                Author Guidelines for {selectedMeta.name}
                <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)', marginLeft: 2 }}>{showGuidelines ? '▲' : '▼'}</span>
              </button>

              {showGuidelines && (
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {/* Stats row */}
                  {[
                    { label: 'Word Limit', value: `${selectedGuidelines.wordLimit.toLocaleString()} words` },
                    { label: 'Abstract', value: `≤ ${selectedGuidelines.abstractLimit} words` },
                    { label: 'References', value: `≤ ${selectedGuidelines.referenceLimit}` },
                    { label: 'Turnaround', value: selectedGuidelines.turnaround },
                    { label: 'Citation Format', value: selectedGuidelines.format },
                    { label: 'Figures', value: selectedGuidelines.figures },
                    { label: 'Publication Fee', value: selectedGuidelines.fee },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 12px' }}>
                      <p style={{ fontSize: 10, color: 'rgba(240,232,208,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px', fontWeight: 600 }}>{item.label}</p>
                      <p style={{ fontSize: 12, color: '#f0e8d0', margin: 0, fontWeight: 500 }}>{item.value}</p>
                    </div>
                  ))}

                  {/* Required sections */}
                  <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
                    <p style={{ fontSize: 10, color: 'rgba(240,232,208,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px', fontWeight: 600 }}>Required Sections</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {selectedGuidelines.requiredSections.map(sec => (
                        <span key={sec} style={{ fontSize: 11, color: 'rgba(240,232,208,0.6)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 9px', borderRadius: 6 }}>{sec}</span>
                      ))}
                    </div>
                  </div>

                  {/* Special notes */}
                  <div style={{ gridColumn: '1 / -1', background: 'rgba(201,148,58,0.05)', border: '1px solid rgba(201,148,58,0.15)', borderRadius: 8, padding: '10px 12px' }}>
                    <p style={{ fontSize: 10, color: 'rgba(201,148,58,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 5px', fontWeight: 600 }}>⚠ Special Requirements</p>
                    <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.5)', margin: 0, lineHeight: 1.6 }}>{selectedGuidelines.specialNotes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

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

      {/* ── Submission Checklist (inline, appears after journal selected) ── */}
      {selected && (
        <div style={{ borderTop: '1px solid rgba(201,148,58,0.15)', paddingTop: 32, marginTop: 8 }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 5px', fontWeight: 700 }}>✦ Step 2</p>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f0e8d0', margin: '0 0 4px', letterSpacing: '-0.3px' }}>Submission Checklist</h3>
            <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0 }}>
              Tailored checklist for <span style={{ color: '#c9943a' }}>{selected}</span> — tick items off as you prepare your manuscript.
            </p>
          </div>
          <SubmissionChecklist
            projectId={projectId}
            targetJournal={selected}
            studyType={studyType}
          />
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
