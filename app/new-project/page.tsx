'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/lib/hooks/useSubscription'

const STUDY_TYPES = [
  { value: 'Case Report',       icon: '📋', desc: 'Single patient case documentation',      color: '#c9943a',  bg: 'rgba(201,148,58,0.1)',   border: 'rgba(201,148,58,0.3)' },
  { value: 'Review Article',    icon: '📖', desc: 'Narrative review of existing literature', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.3)' },
  { value: 'Original Study',    icon: '🔬', desc: 'Primary research with new data',          color: '#34d399',  bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.3)' },
  { value: 'Systematic Review', icon: '🗂',  desc: 'Systematic search and synthesis',        color: '#34d399',  bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)' },
  { value: 'Thesis',            icon: '🎓', desc: 'Academic dissertation or thesis',         color: '#a78bfa',  bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.3)' },
  { value: 'Letter to Editor',  icon: '✉️',  desc: 'Short communication or response',        color: '#f0e8d0',  bg: 'rgba(240,232,208,0.06)', border: 'rgba(240,232,208,0.15)' },
  { value: 'Case Series',       icon: '📂', desc: 'Multiple related case reports',           color: '#fb923c',  bg: 'rgba(249,115,22,0.1)',   border: 'rgba(249,115,22,0.3)' },
  { value: 'Meta-Analysis',     icon: '📊', desc: 'Statistical synthesis of studies',        color: '#fbbf24',  bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.3)' },
  { value: 'Audit',             icon: '✅', desc: 'Clinical audit or quality improvement',   color: '#e879f9',  bg: 'rgba(232,121,249,0.1)',  border: 'rgba(232,121,249,0.3)' },
]

/* ── Journal data (subset for project creation) ──────────────── */
interface JournalOption {
  name: string
  openAccess: boolean
  if: string | null
  wordLimit: number
  fee: string
  turnaround: string
  requiredSections: string[]
  sectionLimits: Record<string, number>
  notes: string
}

const JOURNALS_BY_STUDY_TYPE: Record<string, JournalOption[]> = {
  'Case Report': [
    { name: 'BMJ Case Reports', openAccess: true, if: '1.5', wordLimit: 3000, fee: '£1,770 APC', turnaround: '4–6 weeks',
      requiredSections: ['Abstract','Introduction','Case Presentation','Discussion','Patient Perspective','Learning Points'],
      sectionLimits: { Abstract: 150, Introduction: 300, 'Case Presentation': 1500, Discussion: 700, 'Patient Perspective': 150, 'Learning Points': 100 },
      notes: 'Largest case report journal. Patient consent form mandatory.' },
    { name: 'Cureus', openAccess: true, if: '1.3', wordLimit: 4000, fee: '$150–$500', turnaround: '1–3 weeks',
      requiredSections: ['Abstract','Introduction','Case Presentation','Discussion','Conclusions'],
      sectionLimits: { Abstract: 250, Introduction: 500, 'Case Presentation': 2000, Discussion: 1000, Conclusions: 200 },
      notes: 'Fast review. Good for first-time authors.' },
    { name: 'Journal of Medical Case Reports', openAccess: true, if: '0.9', wordLimit: 3500, fee: '£1,690 APC', turnaround: '4–8 weeks',
      requiredSections: ['Abstract','Introduction','Case Presentation','Discussion','Conclusions'],
      sectionLimits: { Abstract: 200, Introduction: 400, 'Case Presentation': 1700, Discussion: 900, Conclusions: 200 },
      notes: 'CARE checklist required.' },
    { name: 'American Journal of Case Reports', openAccess: true, if: '1.4', wordLimit: 3000, fee: '$350', turnaround: '4–6 weeks',
      requiredSections: ['Abstract','Background','Case Report','Discussion','Conclusions'],
      sectionLimits: { Abstract: 200, Background: 300, 'Case Report': 1500, Discussion: 800, Conclusions: 150 },
      notes: 'Broad medical scope.' },
    { name: 'Postgraduate Medical Journal', openAccess: false, if: '3.0', wordLimit: 3000, fee: 'None', turnaround: '6–8 weeks',
      requiredSections: ['Abstract','Introduction','Case Presentation','Discussion'],
      sectionLimits: { Abstract: 200, Introduction: 400, 'Case Presentation': 1500, Discussion: 800 },
      notes: 'Ideal for residents and postgraduate doctors.' },
  ],
  'Case Series': [
    { name: 'BMJ Case Reports', openAccess: true, if: '1.5', wordLimit: 3000, fee: '£1,770 APC', turnaround: '4–6 weeks',
      requiredSections: ['Abstract','Introduction','Case Presentations','Discussion','Learning Points'],
      sectionLimits: { Abstract: 150, Introduction: 300, 'Case Presentations': 1800, Discussion: 600, 'Learning Points': 100 },
      notes: 'Patient consent required for each case.' },
    { name: 'Cureus', openAccess: true, if: '1.3', wordLimit: 4000, fee: '$150–$500', turnaround: '1–3 weeks',
      requiredSections: ['Abstract','Introduction','Case Presentations','Discussion','Conclusions'],
      sectionLimits: { Abstract: 250, Introduction: 500, 'Case Presentations': 2000, Discussion: 1000, Conclusions: 200 },
      notes: 'Fast review.' },
    { name: 'Journal of Medical Case Reports', openAccess: true, if: '0.9', wordLimit: 3500, fee: '£1,690 APC', turnaround: '4–8 weeks',
      requiredSections: ['Abstract','Introduction','Case Presentations','Discussion','Conclusions'],
      sectionLimits: { Abstract: 200, Introduction: 400, 'Case Presentations': 1800, Discussion: 900, Conclusions: 150 },
      notes: 'Good for multiple rare cases.' },
  ],
  'Original Study': [
    { name: 'PLOS ONE', openAccess: true, if: '3.7', wordLimit: 5000, fee: '$1,955', turnaround: '5–8 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion'],
      sectionLimits: { Abstract: 300, Introduction: 600, Methods: 1200, Results: 1500, Discussion: 1200 },
      notes: 'Judges scientific soundness only. Data availability required.' },
    { name: 'BMJ Open', openAccess: true, if: '2.9', wordLimit: 4000, fee: '£2,000 APC', turnaround: '4–8 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion','Conclusion'],
      sectionLimits: { Abstract: 300, Introduction: 500, Methods: 1000, Results: 1000, Discussion: 900, Conclusion: 200 },
      notes: 'CONSORT/STROBE checklist required.' },
    { name: 'JAMA', openAccess: false, if: '157', wordLimit: 3000, fee: 'None', turnaround: '4–6 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion'],
      sectionLimits: { Abstract: 350, Introduction: 250, Methods: 700, Results: 800, Discussion: 700 },
      notes: 'Rejection rate >90%. Strong clinical relevance needed.' },
    { name: 'NEJM', openAccess: false, if: '176', wordLimit: 3000, fee: 'None', turnaround: '2–4 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion'],
      sectionLimits: { Abstract: 200, Introduction: 250, Methods: 700, Results: 900, Discussion: 800 },
      notes: 'Most competitive journal. Rejection rate >90%.' },
    { name: 'The Lancet', openAccess: false, if: '168', wordLimit: 3000, fee: 'None', turnaround: '4–6 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion'],
      sectionLimits: { Abstract: 200, Introduction: 250, Methods: 750, Results: 900, Discussion: 750 },
      notes: 'High clinical relevance required.' },
  ],
  'Review Article': [
    { name: 'PLOS ONE', openAccess: true, if: '3.7', wordLimit: 5000, fee: '$1,955', turnaround: '5–8 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion'],
      sectionLimits: { Abstract: 300, Introduction: 600, Methods: 1000, Results: 1500, Discussion: 1400 },
      notes: 'Systematic/narrative reviews welcome.' },
    { name: 'Postgraduate Medical Journal', openAccess: false, if: '3.0', wordLimit: 3000, fee: 'None', turnaround: '6–8 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Discussion','Conclusion'],
      sectionLimits: { Abstract: 200, Introduction: 400, Methods: 600, Discussion: 1400, Conclusion: 250 },
      notes: 'Good for clinically focused reviews.' },
    { name: 'JAMA', openAccess: false, if: '157', wordLimit: 3000, fee: 'None', turnaround: '4–6 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion'],
      sectionLimits: { Abstract: 350, Introduction: 250, Methods: 700, Results: 800, Discussion: 700 },
      notes: 'Highly competitive. AMA style.' },
    { name: 'Annals of Internal Medicine', openAccess: false, if: '39', wordLimit: 3500, fee: 'None', turnaround: '4–6 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion'],
      sectionLimits: { Abstract: 250, Introduction: 400, Methods: 800, Results: 1000, Discussion: 900 },
      notes: 'Strong clinical practice preference.' },
  ],
  'Systematic Review': [
    { name: 'BMJ Open', openAccess: true, if: '2.9', wordLimit: 4000, fee: '£2,000 APC', turnaround: '4–8 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion'],
      sectionLimits: { Abstract: 300, Introduction: 500, Methods: 1000, Results: 1000, Discussion: 900 },
      notes: 'PRISMA checklist mandatory.' },
    { name: 'PLOS ONE', openAccess: true, if: '3.7', wordLimit: 5000, fee: '$1,955', turnaround: '5–8 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion'],
      sectionLimits: { Abstract: 300, Introduction: 600, Methods: 1200, Results: 1500, Discussion: 1200 },
      notes: 'PRISMA preferred.' },
    { name: 'The Lancet', openAccess: false, if: '168', wordLimit: 3000, fee: 'None', turnaround: '4–6 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion'],
      sectionLimits: { Abstract: 200, Introduction: 300, Methods: 700, Results: 900, Discussion: 700 },
      notes: 'Very high bar. Large clinical impact required.' },
  ],
  'Meta-Analysis': [
    { name: 'JAMA', openAccess: false, if: '157', wordLimit: 3000, fee: 'None', turnaround: '4–6 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion'],
      sectionLimits: { Abstract: 350, Introduction: 250, Methods: 700, Results: 800, Discussion: 700 },
      notes: 'PRISMA + statistical plan required.' },
    { name: 'PLOS ONE', openAccess: true, if: '3.7', wordLimit: 5000, fee: '$1,955', turnaround: '5–8 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion'],
      sectionLimits: { Abstract: 300, Introduction: 600, Methods: 1200, Results: 1500, Discussion: 1200 },
      notes: 'PRISMA required.' },
    { name: 'Annals of Internal Medicine', openAccess: false, if: '39', wordLimit: 3500, fee: 'None', turnaround: '4–6 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion'],
      sectionLimits: { Abstract: 250, Introduction: 400, Methods: 800, Results: 1000, Discussion: 900 },
      notes: 'High-quality meta-analyses preferred.' },
  ],
  'Thesis': [
    { name: 'PLOS ONE', openAccess: true, if: '3.7', wordLimit: 5000, fee: '$1,955', turnaround: '5–8 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion'],
      sectionLimits: { Abstract: 300, Introduction: 700, Methods: 1200, Results: 1500, Discussion: 1100 },
      notes: 'Good for converting thesis chapters to papers.' },
    { name: 'BMJ Open', openAccess: true, if: '2.9', wordLimit: 4000, fee: '£2,000 APC', turnaround: '4–8 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion'],
      sectionLimits: { Abstract: 300, Introduction: 500, Methods: 1000, Results: 1000, Discussion: 900 },
      notes: 'Accepts well-conducted research.' },
    { name: 'Cureus', openAccess: true, if: '1.3', wordLimit: 4000, fee: '$150–$500', turnaround: '1–3 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion','Conclusions'],
      sectionLimits: { Abstract: 250, Introduction: 500, Methods: 900, Results: 1000, Discussion: 1000, Conclusions: 200 },
      notes: 'Good for early career researchers.' },
  ],
  'Audit': [
    { name: 'BMJ Open', openAccess: true, if: '2.9', wordLimit: 4000, fee: '£2,000 APC', turnaround: '4–8 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion','Recommendations'],
      sectionLimits: { Abstract: 300, Introduction: 500, Methods: 900, Results: 900, Discussion: 900, Recommendations: 300 },
      notes: 'Accepts quality improvement studies.' },
    { name: 'Postgraduate Medical Journal', openAccess: false, if: '3.0', wordLimit: 3000, fee: 'None', turnaround: '6–8 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion','Recommendations'],
      sectionLimits: { Abstract: 200, Introduction: 400, Methods: 600, Results: 700, Discussion: 700, Recommendations: 250 },
      notes: 'Good for clinical audit.' },
    { name: 'Cureus', openAccess: true, if: '1.3', wordLimit: 4000, fee: '$150–$500', turnaround: '1–3 weeks',
      requiredSections: ['Abstract','Introduction','Methods','Results','Discussion','Conclusions'],
      sectionLimits: { Abstract: 250, Introduction: 500, Methods: 900, Results: 1000, Discussion: 1000, Conclusions: 200 },
      notes: 'Fast turnaround for quality improvement reports.' },
  ],
  'Letter to Editor': [
    { name: 'NEJM', openAccess: false, if: '176', wordLimit: 400, fee: 'None', turnaround: '2–4 weeks',
      requiredSections: ['Body','References'],
      sectionLimits: { Body: 400 },
      notes: '≤400 words, ≤5 references. No abstract.' },
    { name: 'JAMA', openAccess: false, if: '157', wordLimit: 400, fee: 'None', turnaround: '2–4 weeks',
      requiredSections: ['Body','References'],
      sectionLimits: { Body: 400 },
      notes: '≤400 words. Must be in response to published article.' },
    { name: 'The Lancet', openAccess: false, if: '168', wordLimit: 250, fee: 'None', turnaround: '1–2 weeks',
      requiredSections: ['Body'],
      sectionLimits: { Body: 250 },
      notes: '≤250 words. Concise clinical observations.' },
    { name: 'Postgraduate Medical Journal', openAccess: false, if: '3.0', wordLimit: 500, fee: 'None', turnaround: '4–6 weeks',
      requiredSections: ['Body','References'],
      sectionLimits: { Body: 500 },
      notes: 'Good for responses to recent articles.' },
  ],
}

const NAV = [
  { label: 'Overview',     icon: '◈', href: '/dashboard' },
  { label: 'All Projects', icon: '⬡', href: '/projects' },
  { label: 'New Project',  icon: '+', href: '/new-project' },
  { label: 'Tools',        icon: '🔧', href: '/tools' },
  { label: 'Settings',     icon: '⚙', href: '/settings' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [title, setTitle]           = useState('')
  const [studyType, setStudyType]   = useState('')
  const [targetJournal, setTargetJournal] = useState<JournalOption | null>(null)
  const [journalSearch, setJournalSearch] = useState('')
  const [loading, setLoading]       = useState(false)
  const [step, setStep]             = useState<1|2|3>(1)
  const [projectCount, setProjectCount] = useState(0)
  const { isScholar, projectLimit } = useSubscription()

  useEffect(() => {
    const checkCount = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.push('/login'); return }
      const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      setProjectCount(count || 0)
    }
    checkCount()
  }, [])

  const atLimit = !isScholar && projectCount >= projectLimit
  const allJournalOptions = studyType ? (JOURNALS_BY_STUDY_TYPE[studyType] || []) : []
  const journalOptions = journalSearch.trim()
    ? allJournalOptions.filter(j => j.name.toLowerCase().includes(journalSearch.toLowerCase()) || j.notes.toLowerCase().includes(journalSearch.toLowerCase()))
    : allJournalOptions

  const handleCreate = async () => {
    if (!title.trim() || !studyType) return
    if (atLimit) { router.push('/projects'); return }
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.push('/login'); return }

      const { data, error } = await supabase.from('projects')
        .insert({ title: title.trim(), study_type: studyType, user_id: user.id })
        .select().single()
      if (error) { console.error(error.message); return }

      // Save target journal + journal-specific sections to project_sections
      if (targetJournal) {
        // Build section list from journal's required sections, appending References + Plagiarism Check
        const journalSpecificSections = [
          ...targetJournal.requiredSections.filter(s => s !== 'References'),
          'References',
          'Plagiarism Check',
        ]
        await Promise.all([
          supabase.from('project_sections').insert({
            project_id: data.id, user_id: user.id,
            section: '__target_journal__', content: targetJournal.name,
          }),
          supabase.from('project_sections').insert({
            project_id: data.id, user_id: user.id,
            section: '__journal_sections__', content: JSON.stringify(journalSpecificSections),
          }),
          supabase.from('project_sections').insert({
            project_id: data.id, user_id: user.id,
            section: '__journal_section_limits__', content: JSON.stringify(targetJournal.sectionLimits),
          }),
        ])
      }

      router.push(`/workspace/${data.id}`)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const selectedStudyMeta = STUDY_TYPES.find(t => t.value === studyType)
  const canProceed   = title.trim().length > 0
  const readyCreate  = title.trim() && studyType

  return (
    <div className="workspace-layout" style={{ background: '#080c18', fontFamily: "var(--font-inter), 'DM Sans', system-ui, sans-serif", color: '#f0e8d0' }}>

      {/* SIDEBAR */}
      <aside className="workspace-sidebar">
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(201,148,58,0.6), transparent)' }}/>
        <div style={{ padding: '0 24px 32px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.webp" alt="R" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(201,148,58,0.2)' }}/>
            <span style={{ fontSize: 17, fontWeight: 700, fontFamily: "var(--font-cinzel), 'Cormorant Garamond', serif", letterSpacing: '0.02em' }}>
              <span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span>
            </span>
          </Link>
        </div>
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => {
            const active = item.href === '/new-project'
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                  background: active ? 'rgba(201,148,58,0.12)' : 'transparent',
                  color: active ? '#c9943a' : 'rgba(240,232,208,0.5)',
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  border: active ? '1px solid rgba(201,148,58,0.25)' : '1px solid transparent',
                  transition: 'all 0.18s',
                }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color='rgba(240,232,208,0.8)' } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='rgba(240,232,208,0.5)' } }}
                >
                  <span style={{ fontSize: 15, color: active ? '#c9943a' : 'inherit', opacity: active ? 1 : 0.6 }}>{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Preview card */}
        {(title || studyType) && (
          <div style={{ margin: '16px 12px 0', padding: '14px', borderRadius: 12, background: 'rgba(201,148,58,0.06)', border: '1px solid rgba(201,148,58,0.15)', animation: 'fadeInUp 0.3s both' }}>
            <p style={{ fontSize: 10, color: 'rgba(201,148,58,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Preview</p>
            {selectedStudyMeta && <div style={{ fontSize: 16, marginBottom: 6 }}>{selectedStudyMeta.icon}</div>}
            <p style={{ fontSize: 12, fontWeight: 600, color: '#f0e8d0', margin: '0 0 4px', lineHeight: 1.4 }}>{title || '—'}</p>
            {studyType && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: selectedStudyMeta?.bg, color: selectedStudyMeta?.color, border: `1px solid ${selectedStudyMeta?.border}` }}>{studyType}</span>}
            {targetJournal && (
              <p style={{ fontSize: 10, color: 'rgba(201,148,58,0.6)', margin: '8px 0 0', lineHeight: 1.4 }}>
                🗂 {targetJournal.name}
              </p>
            )}
          </div>
        )}
      </aside>

      {/* MAIN */}
      <main className="workspace-content" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ position: 'fixed', top: '20%', right: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,148,58,0.05) 0%, transparent 70%)', pointerEvents: 'none' }}/>

        <div style={{ width: '100%', maxWidth: 700 }}>

          {atLimit && (
            <div style={{ marginBottom: 24, padding: '14px 18px', borderRadius: 12, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.25)', animation: 'fadeInUp 0.3s both' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#f87171', margin: '0 0 4px' }}>🔒 Project limit reached</p>
              <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.45)', margin: 0 }}>You've used all {projectLimit} free projects. <Link href="/projects" style={{ color: '#c9943a', textDecoration: 'underline' }}>Upgrade to Scholar</Link> for unlimited.</p>
            </div>
          )}

          {/* Header */}
          <div style={{ marginBottom: 40, animation: 'fadeInUp 0.4s both' }}>
            <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', marginBottom: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>✦ &nbsp; New Workspace</p>
            <h1 style={{ fontSize: 34, fontWeight: 600, color: '#f0e8d0', letterSpacing: '0.01em', margin: 0, fontFamily: "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif", lineHeight: 1.1 }}>
              Create Research Project
            </h1>
          </div>

          {/* Step indicator — 3 steps */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40, animation: 'fadeInUp 0.4s 0.1s both' }}>
            {[
              { n: 1, label: 'Title' },
              { n: 2, label: 'Study Type' },
              { n: 3, label: 'Target Journal' },
            ].map((s, i) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 0 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    background: s.n < step ? 'linear-gradient(135deg,#c9943a,#e8b84a)' : s.n === step ? 'rgba(201,148,58,0.15)' : 'rgba(255,255,255,0.06)',
                    color: s.n < step ? '#080c18' : s.n === step ? '#c9943a' : 'rgba(240,232,208,0.3)',
                    border: s.n === step ? '2px solid #c9943a' : '1px solid transparent',
                    boxShadow: s.n === step ? '0 0 10px rgba(201,148,58,0.35)' : 'none',
                    transition: 'all 0.3s',
                  }}>{s.n < step ? '✓' : s.n}</div>
                  <span style={{ fontSize: 11, color: s.n <= step ? 'rgba(240,232,208,0.65)' : 'rgba(240,232,208,0.25)', fontWeight: s.n === step ? 600 : 400, whiteSpace: 'nowrap' }}>{s.label}</span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 1, margin: '0 12px', background: step > s.n ? 'rgba(201,148,58,0.4)' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s', minWidth: 28 }}/>}
              </div>
            ))}
          </div>

          {/* ── STEP 1 — Title ── */}
          <div style={{ marginBottom: 32, animation: 'fadeInUp 0.4s 0.15s both' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.8)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Project Title
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="e.g. Mesenteric Cyst in a 28-year-old Female"
                value={title}
                onChange={e => { setTitle(e.target.value); if (e.target.value.trim() && step === 1) setStep(2) }}
                style={{
                  width: '100%', padding: '16px 20px',
                  background: 'rgba(255,255,255,0.04)',
                  border: title ? '1px solid rgba(201,148,58,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14, fontSize: 15, color: '#f0e8d0',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxShadow: title ? '0 0 0 3px rgba(201,148,58,0.07)' : 'none',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(201,148,58,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,148,58,0.08)' }}
                onBlur={e => { if (!title) { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' } }}
              />
              {title && (
                <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, borderRadius: '50%', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#34d399' }}>✓</div>
              )}
            </div>
          </div>

          {/* ── STEP 2 — Study type ── */}
          <div style={{ marginBottom: 36, animation: 'fadeInUp 0.4s 0.2s both' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: canProceed ? 'rgba(201,148,58,0.8)' : 'rgba(240,232,208,0.2)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14, transition: 'color 0.3s' }}>
              Study Type
            </label>
            <div className="grid-3" style={{ gap: 10 }}>
              {STUDY_TYPES.map((type, idx) => {
                const selected = studyType === type.value
                return (
                  <button key={type.value} type="button"
                    onClick={() => {
                      setStudyType(type.value)
                      setTargetJournal(null)
                      setJournalSearch('')
                      if (title.trim()) setStep(3)
                    }}
                    style={{
                      padding: '16px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                      background: selected ? type.bg : 'rgba(255,255,255,0.03)',
                      border: selected ? `2px solid ${type.border}` : '2px solid rgba(255,255,255,0.06)',
                      transition: 'all 0.18s', outline: 'none', fontFamily: 'inherit',
                      position: 'relative', overflow: 'hidden',
                      boxShadow: selected ? `0 0 20px ${type.bg}` : 'none',
                      animation: `fadeInUp 0.35s ${0.22 + idx * 0.04}s both`,
                    }}
                    onMouseEnter={e => { if (!selected) { e.currentTarget.style.background=type.bg; e.currentTarget.style.borderColor=type.border+'88' } }}
                    onMouseLeave={e => { if (!selected) { e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.06)' } }}
                  >
                    {selected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${type.color}88,transparent)` }}/>}
                    {selected && <div style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: '50%', background: type.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#080c18', fontWeight: 900 }}>✓</div>}
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{type.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: selected ? type.color : '#f0e8d0', marginBottom: 4 }}>{type.value}</div>
                    <div style={{ fontSize: 10.5, color: 'rgba(240,232,208,0.35)', lineHeight: 1.4 }}>{type.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── STEP 3 — Target Journal ── */}
          {studyType && (
            <div style={{ marginBottom: 36, animation: 'fadeInUp 0.35s both' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.8)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Target Journal <span style={{ fontWeight: 400, color: 'rgba(240,232,208,0.25)', textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>— optional, recommended</span>
                </label>
                {targetJournal && (
                  <button onClick={() => setTargetJournal(null)} style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
                )}
              </div>

              <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: '0 0 16px', lineHeight: 1.6 }}>
                Picking a journal now means you'll know the word limit, required sections, and format <em>before</em> you start writing.
              </p>

              {/* Search bar */}
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'rgba(201,148,58,0.4)', pointerEvents: 'none' }}>⌕</span>
                <input
                  type="text"
                  value={journalSearch}
                  onChange={e => setJournalSearch(e.target.value)}
                  placeholder={`Search journals for ${studyType}…`}
                  style={{
                    width: '100%', padding: '10px 14px 10px 36px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 10, fontSize: 13, color: '#f0e8d0', outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
                />
                {journalSearch && (
                  <button onClick={() => setJournalSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(240,232,208,0.3)', fontSize: 16, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
                )}
              </div>

              {/* Journal list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: targetJournal ? 16 : 0 }}>
                {journalOptions.map(j => {
                  const sel = targetJournal?.name === j.name
                  return (
                    <button key={j.name} onClick={() => { setTargetJournal(j); setStep(3) }}
                      style={{
                        padding: '14px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                        background: sel ? 'rgba(201,148,58,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${sel ? 'rgba(201,148,58,0.45)' : 'rgba(255,255,255,0.07)'}`,
                        transition: 'all 0.15s', outline: 'none', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                      }}
                      onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor='rgba(201,148,58,0.25)' }}
                      onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor='rgba(255,255,255,0.07)' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: sel ? '#e8c878' : '#f0e8d0' }}>{j.name}</span>
                          {sel && <span style={{ fontSize: 9, fontWeight: 700, color: '#c9943a', background: 'rgba(201,148,58,0.12)', border: '1px solid rgba(201,148,58,0.3)', padding: '1px 7px', borderRadius: 20 }}>SELECTED</span>}
                        </div>
                        <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.35)', margin: '0 0 6px', lineHeight: 1.4 }}>{j.notes}</p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {j.if && <span style={{ fontSize: 10, fontWeight: 700, color: parseFloat(j.if) >= 50 ? '#f59e0b' : parseFloat(j.if) >= 10 ? '#c9943a' : 'rgba(240,232,208,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 7px', borderRadius: 20 }}>IF {j.if}</span>}
                          {j.openAccess && <span style={{ fontSize: 10, fontWeight: 600, color: '#34d399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', padding: '2px 7px', borderRadius: 20 }}>Open Access</span>}
                          <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.3)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 20 }}>{j.wordLimit.toLocaleString()} words</span>
                          <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.25)', padding: '2px 0' }}>{j.turnaround}</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Selected journal requirements card */}
              {targetJournal && (
                <div style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(201,148,58,0.05)', border: '1px solid rgba(201,148,58,0.25)', animation: 'fadeInUp 0.3s both' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(201,148,58,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 14px' }}>
                    📋 Key Requirements — {targetJournal.name}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                    {[
                      { label: 'Word Limit', value: `${targetJournal.wordLimit.toLocaleString()} words` },
                      { label: 'Fee', value: targetJournal.fee },
                      { label: 'Turnaround', value: targetJournal.turnaround },
                    ].map(item => (
                      <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 9, padding: '9px 12px' }}>
                        <p style={{ fontSize: 9, color: 'rgba(240,232,208,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px', fontWeight: 700 }}>{item.label}</p>
                        <p style={{ fontSize: 12, color: '#f0e8d0', margin: 0, fontWeight: 600 }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p style={{ fontSize: 9, color: 'rgba(240,232,208,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px', fontWeight: 700 }}>Section Word Limits</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6 }}>
                      {targetJournal.requiredSections.filter(s => s !== 'References' && s !== 'Plagiarism Check').map(s => {
                        const lim = targetJournal.sectionLimits[s]
                        return (
                          <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,148,58,0.15)' }}>
                            <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.6)', fontWeight: 500 }}>{s}</span>
                            {lim
                              ? <span style={{ fontSize: 11, color: '#c9943a', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>≤ {lim.toLocaleString()} w</span>
                              : <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.2)' }}>—</span>
                            }
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Skip hint */}
              {!targetJournal && (
                <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.2)', marginTop: 8 }}>
                  You can also pick a journal later from the Journal Selector inside your workspace.
                </p>
              )}
            </div>
          )}

          {/* ── Create button ── */}
          <div style={{ animation: 'fadeInUp 0.4s 0.6s both', paddingBottom: 48 }}>
            <button type="button" onClick={handleCreate}
              disabled={loading || !readyCreate}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 14,
                backgroundImage: !readyCreate ? 'none' : 'linear-gradient(135deg,#c9943a 0%,#e8b84a 50%,#c9943a 100%)',
                backgroundColor: !readyCreate ? 'rgba(255,255,255,0.05)' : 'transparent',
                color: !readyCreate ? 'rgba(240,232,208,0.2)' : '#080c18',
                border: 'none', fontSize: 15, fontWeight: 800,
                cursor: !readyCreate ? 'not-allowed' : 'pointer',
                transition: 'all 0.25s',
                boxShadow: readyCreate ? '0 8px 30px rgba(201,148,58,0.3)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontFamily: "var(--font-inter), sans-serif",
              }}
              onMouseEnter={e => { if (readyCreate && !loading) { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 12px 40px rgba(201,148,58,0.45)' } }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow=readyCreate?'0 8px 30px rgba(201,148,58,0.3)':'none' }}
            >
              {loading ? (
                <><span style={{ width: 16, height: 16, border: '2px solid rgba(8,12,24,0.3)', borderTopColor: '#080c18', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/>Creating workspace…</>
              ) : (
                <>✦ &nbsp; Create Project{selectedStudyMeta ? ` — ${selectedStudyMeta.value}` : ''}</>
              )}
            </button>

            <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(240,232,208,0.2)', marginTop: 14 }}>
              {targetJournal
                ? `Writing for ${targetJournal.name} · ${targetJournal.wordLimit.toLocaleString()} word limit`
                : 'You can pick a journal from within the workspace at any time.'}
            </p>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
