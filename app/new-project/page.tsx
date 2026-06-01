'use client'


import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/lib/hooks/useSubscription'

const STUDY_TYPES = [
  { value: 'Case Report',       icon: '📋', desc: 'Single patient case documentation',  color: '#c9943a',  bg: 'rgba(201,148,58,0.1)',   border: 'rgba(201,148,58,0.3)' },
  { value: 'Review Article',    icon: '📖', desc: 'Narrative review of existing literature', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.3)' },
  { value: 'Original Study',    icon: '🔬', desc: 'Primary research with new data',     color: '#34d399',  bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.3)' },
  { value: 'Systematic Review', icon: '🗂',  desc: 'Systematic search and synthesis',   color: '#34d399',  bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)' },
  { value: 'Thesis',            icon: '🎓', desc: 'Academic dissertation or thesis',    color: '#a78bfa',  bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.3)' },
  { value: 'Letter to Editor',  icon: '✉️',  desc: 'Short communication or response',   color: '#f0e8d0',  bg: 'rgba(240,232,208,0.06)', border: 'rgba(240,232,208,0.15)' },
  { value: 'Case Series',       icon: '📂', desc: 'Multiple related case reports',      color: '#fb923c',  bg: 'rgba(249,115,22,0.1)',   border: 'rgba(249,115,22,0.3)' },
  { value: 'Meta-Analysis',     icon: '📊', desc: 'Statistical synthesis of studies',   color: '#fbbf24',  bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.3)' },
  { value: 'Audit',             icon: '✅', desc: 'Clinical audit or quality improvement', color: '#e879f9', bg: 'rgba(232,121,249,0.1)', border: 'rgba(232,121,249,0.3)' },
]

const NAV = [
  { label: 'Overview',    icon: '◈', href: '/dashboard' },
  { label: 'Projects',    icon: '⬡', href: '/projects' },
  { label: 'New Project', icon: '+', href: '/new-project' },
  { label: 'Tools',       icon: '🔧', href: '/tools' },
  { label: 'Settings',    icon: '⚙', href: '/settings' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [title, setTitle]         = useState('')
  const [studyType, setStudyType] = useState('')
  const [loading, setLoading]     = useState(false)
  const [step, setStep]           = useState<1|2>(1)
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
      router.push(`/workspace/${data.id}`)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const selectedMeta = STUDY_TYPES.find(t => t.value === studyType)
  const canProceed = title.trim().length > 0

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

        {/* Preview card in sidebar */}
        {(title || studyType) && (
          <div style={{ margin: '16px 12px 0', padding: '14px', borderRadius: 12, background: 'rgba(201,148,58,0.06)', border: '1px solid rgba(201,148,58,0.15)', animation: 'fadeInUp 0.3s both' }}>
            <p style={{ fontSize: 10, color: 'rgba(201,148,58,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Preview</p>
            {selectedMeta && <div style={{ fontSize: 16, marginBottom: 6 }}>{selectedMeta.icon}</div>}
            <p style={{ fontSize: 12, fontWeight: 600, color: '#f0e8d0', margin: '0 0 4px', lineHeight: 1.4, textTransform: 'capitalize' }}>{title || '—'}</p>
            {studyType && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: selectedMeta?.bg, color: selectedMeta?.color, border: `1px solid ${selectedMeta?.border}` }}>{studyType}</span>}
          </div>
        )}
      </aside>

      {/* MAIN */}
      <main className="workspace-content" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ position: 'fixed', top: '20%', right: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,148,58,0.05) 0%, transparent 70%)', pointerEvents: 'none' }}/>

        <div style={{ width: '100%', maxWidth: 700 }}>

          {/* Limit warning */}
          {atLimit && (
            <div style={{ marginBottom: 24, padding: '14px 18px', borderRadius: 12, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.25)', animation: 'fadeInUp 0.3s both' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#f87171', margin: '0 0 4px' }}>🔒 Project limit reached</p>
              <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.45)', margin: 0 }}>You've used all {projectLimit} free projects. <Link href="/projects" style={{ color: '#c9943a', textDecoration: 'underline' }}>Upgrade to Scholar</Link> for unlimited projects.</p>
            </div>
          )}

          {/* Header */}
          <div style={{ marginBottom: 44, animation: 'fadeInUp 0.4s both' }}>
            <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', marginBottom: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>✦ &nbsp; New Workspace</p>
            <h1 style={{ fontSize: 36, fontWeight: 600, color: '#f0e8d0', letterSpacing: '0.01em', margin: 0, fontFamily: "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif", lineHeight: 1.1 }}>
              Create Research Project
            </h1>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40, animation: 'fadeInUp 0.4s 0.1s both' }}>
            {[
              { n: 1, label: 'Project Title' },
              { n: 2, label: 'Study Type' },
            ].map((s, i) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < 1 ? 0 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    background: s.n <= step ? 'linear-gradient(135deg, #c9943a, #e8b84a)' : 'rgba(255,255,255,0.06)',
                    color: s.n <= step ? '#080c18' : 'rgba(240,232,208,0.3)',
                    border: s.n === step ? '2px solid #c9943a' : '1px solid transparent',
                    boxShadow: s.n === step ? '0 0 12px rgba(201,148,58,0.4)' : 'none',
                    transition: 'all 0.3s',
                  }}>{s.n < step ? '✓' : s.n}</div>
                  <span style={{ fontSize: 12, color: s.n <= step ? 'rgba(240,232,208,0.7)' : 'rgba(240,232,208,0.3)', fontWeight: s.n === step ? 600 : 400 }}>{s.label}</span>
                </div>
                {i < 1 && <div style={{ flex: 1, height: 1, margin: '0 16px', background: step > 1 ? 'rgba(201,148,58,0.4)' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s', minWidth: 40 }}/>}
              </div>
            ))}
          </div>

          {/* STEP 1 — Title */}
          <div style={{ marginBottom: 32, animation: 'fadeInUp 0.4s 0.15s both' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.8)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Project Title
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="e.g. Mesenteric Cyst in a 28-year-old Female"
                value={title}
                onChange={e => { setTitle(e.target.value); if (e.target.value.trim()) setStep(2) }}
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
            {title && <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', marginTop: 8 }}>Now select your study type below ↓</p>}
          </div>

          {/* STEP 2 — Study type */}
          <div style={{ marginBottom: 36, animation: 'fadeInUp 0.4s 0.2s both' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: canProceed ? 'rgba(201,148,58,0.8)' : 'rgba(240,232,208,0.2)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14, transition: 'color 0.3s' }}>
              Study Type
            </label>
            <div className="grid-3" style={{ gap: 10 }}>
              {STUDY_TYPES.map((type, idx) => {
                const selected = studyType === type.value
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setStudyType(type.value)}
                    style={{
                      padding: '16px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                      background: selected ? type.bg : 'rgba(255,255,255,0.03)',
                      border: selected ? `2px solid ${type.border}` : '2px solid rgba(255,255,255,0.06)',
                      transition: 'all 0.18s', outline: 'none', fontFamily: 'inherit',
                      position: 'relative', overflow: 'hidden',
                      boxShadow: selected ? `0 0 20px ${type.bg}` : 'none',
                      animation: `fadeInUp 0.35s ${0.22 + idx * 0.04}s both`,
                    }}
                    onMouseEnter={e => { if (!selected) { e.currentTarget.style.background = type.bg; e.currentTarget.style.borderColor = type.border + '88' } }}
                    onMouseLeave={e => { if (!selected) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' } }}
                  >
                    {/* top tint */}
                    {selected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${type.color}88, transparent)` }}/>}
                    {selected && (
                      <div style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: '50%', background: type.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#080c18', fontWeight: 900 }}>✓</div>
                    )}
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{type.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: selected ? type.color : '#f0e8d0', marginBottom: 4, transition: 'color 0.18s' }}>{type.value}</div>
                    <div style={{ fontSize: 10.5, color: 'rgba(240,232,208,0.35)', lineHeight: 1.4 }}>{type.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Submit */}
          <div style={{ animation: 'fadeInUp 0.4s 0.6s both' }}>
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading || !title.trim() || !studyType}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 14,
                backgroundImage: (!title.trim() || !studyType) ? 'none' : 'linear-gradient(135deg, #c9943a 0%, #e8b84a 50%, #c9943a 100%)',
                backgroundColor: (!title.trim() || !studyType) ? 'rgba(255,255,255,0.05)' : 'transparent',
                color: (!title.trim() || !studyType) ? 'rgba(240,232,208,0.2)' : '#080c18',
                border: 'none', fontSize: 15, fontWeight: 800,
                cursor: (!title.trim() || !studyType) ? 'not-allowed' : 'pointer',
                transition: 'all 0.25s',
                boxShadow: (title.trim() && studyType) ? '0 8px 30px rgba(201,148,58,0.3)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontFamily: "var(--font-inter), sans-serif",
              }}
              onMouseEnter={e => { if (title.trim() && studyType && !loading) { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 12px 40px rgba(201,148,58,0.45)' } }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow=(title.trim() && studyType) ? '0 8px 30px rgba(201,148,58,0.3)' : 'none' }}
            >
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(8,12,24,0.3)', borderTopColor: '#080c18', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/>
                  Creating workspace…
                </>
              ) : (
                <>✦ &nbsp; Create Project{selectedMeta ? ` — ${selectedMeta.value}` : ''}</>
              )}
            </button>

            <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(240,232,208,0.2)', marginTop: 14 }}>
              You can rename your project from the workspace at any time.
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
