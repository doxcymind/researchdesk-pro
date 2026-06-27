'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Superscript from '@tiptap/extension-superscript'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'

interface ReviewIssue {
  type: 'error' | 'warning' | 'success'
  title: string
  detail: string
  question?: string
}

interface ReviewData {
  score: number
  summary: string
  mentor_note: string
  issues: ReviewIssue[]
}

interface EditorPanelProps {
  selectedSection: string
  content: string
  setContent: (value: string) => void
  saving: boolean
  reviewing: boolean
  reviewData: ReviewData | null
  onReview: () => void
  onCloseReview: () => void
  onSave?: () => void
  onKeywordsGenerated?: (keywords: string[]) => void
  sectionWordLimit?: number  // journal-specific override
}

// Fallback limits when no journal is selected
const DEFAULT_WORD_LIMITS: Record<string, number> = {
  Abstract: 250, Introduction: 500, Methods: 600,
  Results: 600, Discussion: 800,
}

const SECTION_GUIDANCE: Record<string, { what: string; structure: string[]; tip: string }> = {
  Abstract: {
    what: 'A concise summary of your entire study — the first thing editors and reviewers read.',
    structure: ['Background — Why was this study needed?', 'Objective — What did you aim to find?', 'Methods — How did you do it? (study design, setting, participants)', 'Results — What did you find? (include key numbers)', 'Conclusion — What does it mean clinically?'],
    tip: 'Write the Abstract last. It\'s easier once the full manuscript is done.',
  },
  Introduction: {
    what: 'Sets the context and justifies why your study was necessary.',
    structure: ['Start broad — the global/national burden of the problem', 'Narrow down — what is known about this specific topic', 'Identify the gap — what is NOT known or NOT done', 'Your study — how you address that gap and your objective'],
    tip: 'Think of it as a funnel — broad at the top, narrow at the bottom ending with your aim.',
  },
  'Case Presentation': {
    what: 'The heart of a case report — a detailed, chronological account of the patient\'s clinical journey.',
    structure: [
      'Patient demographics — age, sex, relevant background (no identifying info)',
      'Chief complaint — why did they present?',
      'History of presenting illness — symptom onset, duration, progression',
      'Past medical, surgical, drug, family, social history (relevant only)',
      'Examination findings — vitals, systemic examination, key positives AND negatives',
      'Investigations — lab values, imaging findings (describe what you saw, not just "normal")',
      'Diagnosis — how was the final diagnosis reached?',
      'Treatment — what was done? Drug names, doses, procedures, timeline',
      'Outcome — what happened? Discharge, follow-up, recovery',
    ],
    tip: 'Write like you are presenting at a grand round. Be precise with numbers — age, values, doses, timelines. Avoid vague words like "elevated" — say the actual value.',
  },
  'Case Presentations': {
    what: 'Present each case clearly and consistently so readers can compare across cases.',
    structure: [
      'Number each case (Case 1, Case 2, etc.) with a brief header',
      'For each: demographics → presentation → investigations → diagnosis → treatment → outcome',
      'Use a summary table at the end comparing key features across all cases',
      'Highlight what is similar AND different between cases',
    ],
    tip: 'Consistent structure across cases is critical. Readers must be able to scan and compare. Consider a table.',
  },
  'Patient Perspective': {
    what: 'Required by BMJ Case Reports — the patient\'s own voice about their experience. Written in first person or as a direct quote.',
    structure: [
      'How the patient felt when first experiencing symptoms',
      'Their journey to diagnosis — delays, misdiagnoses, emotions',
      'Their experience of treatment and hospital care',
      'How they feel now and what they want others to know',
    ],
    tip: 'This should genuinely reflect the patient\'s voice. It can be a short paragraph (2–4 sentences) or a few bullet points. Get patient approval before publishing.',
  },
  'Learning Points': {
    what: 'Three concise bullet points summarising what clinicians should take away from your case. Required by BMJ Case Reports.',
    structure: [
      '• What is rare/unusual about this case — why it matters',
      '• Key diagnostic insight or pitfall to avoid',
      '• Clinical management pearl or treatment takeaway',
    ],
    tip: 'Each point should be one sentence, starting with an action word ("Consider...", "Clinicians should...", "This case highlights..."). These are the most-read part of case reports — make them sharp.',
  },
  Discussion: {
    what: 'Interprets your results in the context of existing literature.',
    structure: ['Open with your key finding (one sentence)', 'Compare with previous studies — agree or disagree?', 'Explain WHY your results are what they are', 'Acknowledge limitations (every study has them — be honest)', 'Clinical/research implications — what does this mean in practice?'],
    tip: 'The Discussion is where you show your depth of understanding. Don\'t just repeat the Results.',
  },
  Methods: {
    what: 'Describes exactly how you conducted the study — detailed enough for another researcher to replicate.',
    structure: ['Study design & setting (RCT, cohort, etc. — where & when)', 'Participants (inclusion/exclusion criteria, how recruited)', 'Intervention or exposure (what was done to/by participants)', 'Outcome measures (what you measured and how)', 'Statistical analysis (software, tests used, significance level)', 'Ethics approval (IRB/ethics committee reference number)'],
    tip: 'Imagine someone trying to repeat your study exactly. Have you given them everything they need?',
  },
  Results: {
    what: 'Presents your findings — numbers, data, statistics. No interpretation here.',
    structure: ['Participant flow (how many enrolled, excluded, completed)', 'Baseline characteristics (Table 1 — demographics)', 'Primary outcome (your main finding with statistics)', 'Secondary outcomes (additional findings)', 'Any adverse events or unexpected findings'],
    tip: 'Results section = data only. Save your interpretation for the Discussion.',
  },
  Conclusion: {
    what: 'A brief, punchy summary of what your study proved and what should happen next.',
    structure: ['Restate your key finding (no new data)', 'Clinical implication — what should practitioners do?', 'Research implication — what should future studies do?'],
    tip: 'Keep it to 3-5 sentences. If it\'s longer, it\'s not a conclusion — it\'s another Discussion.',
  },
  Conclusions: {
    what: 'Summarise the key takeaways from your study clearly and concisely.',
    structure: ['What did you find? (one sentence)', 'Why does it matter? (clinical or research significance)', 'What should happen next? (future research or practice change)'],
    tip: 'Avoid introducing new data or citations here. Conclusions = summary + so what.',
  },
  'Literature Review': {
    what: 'A comprehensive synthesis of existing research relevant to your thesis topic.',
    structure: ['Scope — define what you searched and what you included/excluded', 'Organise thematically (not chronologically) — group by concept, not by paper', 'For each theme: summarise what is known, what is debated, what is missing', 'Critically evaluate — don\'t just describe, analyse strengths and weaknesses', 'End with the gap your thesis addresses'],
    tip: 'The literature review is not a summary of papers — it\'s a critical argument about the state of knowledge. Show you understand the field, not just the papers.',
  },
  Body: {
    what: 'The main text of your letter — concise, focused, and evidenced.',
    structure: ['Opening — state your point or response clearly in the first sentence', 'Evidence — 1–2 supporting data points or literature references', 'Clinical implication — why does this matter to readers?', 'Closing — one-sentence call to action or question'],
    tip: 'Letters to editors are ≤400 words. Every sentence must earn its place. No waffle.',
  },
  Background: {
    what: 'Provides context for the case — why this presentation is unusual or clinically important.',
    structure: ['How common or rare is this condition?', 'What is typically known about diagnosis and management?', 'Why is this particular case notable — what makes it worth reporting?'],
    tip: 'Keep it brief (2–3 paragraphs). Cite 3–5 key references. End with the clinical question this case addresses.',
  },
  'Case Report': {
    what: 'A structured account of the patient\'s clinical presentation, diagnosis, and management.',
    structure: ['Patient demographics (age, sex — no identifying details)', 'Presenting complaint and history', 'Examination findings', 'Investigations and results', 'Diagnosis reached', 'Treatment given (with doses and duration)', 'Follow-up and outcome'],
    tip: 'Be precise. Use actual numbers — lab values, drug doses, timeframes. Reviewers will check for consistency.',
  },
  Recommendations: {
    what: 'The actionable output of your audit — what needs to change based on what you found.',
    structure: ['Summarise the gap identified between current practice and the standard', 'List specific, measurable recommendations (SMART format)', 'Assign responsibility — who should implement each recommendation?', 'Propose a re-audit date to close the loop'],
    tip: 'Recommendations should be practical and implementable, not generic. Avoid "improve communication" — say exactly what should change and how it will be measured.',
  },
}

function wordCount(text: string): number {
  // Strip HTML tags for accurate word count
  const plain = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return plain === '' ? 0 : plain.split(/\s+/).length
}

const ISSUE_CONFIG = {
  error:   { icon: '✕', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  warning: { icon: '⚠', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  success: { icon: '✓', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
}

function ScoreRing({ score }: { score: number }) {
  const r = 32
  const circ = 2 * Math.PI * r
  const filled = circ * (score / 100)
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#f59e0b' : '#f87171'
  const label = score >= 75 ? 'Good' : score >= 50 ? 'Developing' : 'Needs Work'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 44 44)" style={{ transition: 'stroke-dasharray 0.8s ease' }}/>
        <text x="44" y="47" textAnchor="middle" fill={color} fontSize="16" fontWeight="800">{score}</text>
        <text x="44" y="60" textAnchor="middle" fill="rgba(240,232,208,0.3)" fontSize="8">/100</text>
      </svg>
      <span style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: '0.06em' }}>{label}</span>
    </div>
  )
}

// ── Toolbar button ──────────────────────────────────────────
function ToolbarBtn({ onClick, active, disabled, title, children }: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      style={{
        padding: '5px 9px', borderRadius: 7, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? 'rgba(201,148,58,0.25)' : 'transparent',
        color: active ? '#e8b84a' : disabled ? 'rgba(240,232,208,0.2)' : 'rgba(240,232,208,0.6)',
        fontSize: 13, fontWeight: active ? 700 : 500, transition: 'all 0.15s', lineHeight: 1,
      }}
    >{children}</button>
  )
}

// ── Divider ──────────────────────────────────────────────────
function ToolbarDivider() {
  return <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', margin: '0 2px', flexShrink: 0 }} />
}

export default function EditorPanel({
  selectedSection, content, setContent, saving,
  reviewing, reviewData, onReview, onCloseReview, onSave, onKeywordsGenerated,
  sectionWordLimit,
}: EditorPanelProps) {
  const limit = sectionWordLimit ?? DEFAULT_WORD_LIMITS[selectedSection] ?? 0
  const isJournalLimit = sectionWordLimit != null
  const panelRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordsLoading, setKeywordsLoading] = useState(false)
  const [copiedKw, setCopiedKw] = useState<string | null>(null)
  const [aiAction, setAiAction] = useState<string | null>(null)
  const [showTableMenu, setShowTableMenu] = useState(false)
  const citationCountRef = useRef(0)
  const isAbstract = selectedSection === 'Abstract'
  const guidance = SECTION_GUIDANCE[selectedSection]

  // ── Table templates ──────────────────────────────────────────
  const TABLE_TEMPLATES: { label: string; cols: number; rows: number }[] = [
    { label: '2 columns × 3 rows', cols: 2, rows: 3 },
    { label: '3 columns × 3 rows', cols: 3, rows: 3 },
    { label: '4 columns × 3 rows', cols: 4, rows: 3 },
    { label: '3 columns × 5 rows', cols: 3, rows: 5 },
    { label: '5 columns × 4 rows', cols: 5, rows: 4 },
  ]

  const insertTableTemplate = (template: { label: string; cols: number; rows: number }) => {
    if (!editor) return
    setShowTableMenu(false)
    editor.chain().focus().insertTable({ rows: template.rows, cols: template.cols, withHeaderRow: true }).run()
  }

  const insertCitation = () => {
    if (!editor) return
    citationCountRef.current += 1
    editor.chain().focus().insertContent(`<sup>[${citationCountRef.current}]</sup>`).run()
  }

  const insertFigure = () => {
    if (!editor) return
    editor.chain().focus().insertContent(
      `<p><em>[Figure ${citationCountRef.current + 1}: Add figure description here]</em></p>`
    ).run()
  }

  // ── TipTap editor ──────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, code: false }),
      Underline,
      Superscript,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        spellcheck: 'true',
      },
    },
  })

  // Keep TipTap in sync with the `content` prop, which the parent treats as the
  // single source of truth (it clears to '' on section switch, then loads from DB).
  // Reconciling directly against `content` — rather than tracking section changes —
  // avoids an effect-ordering race where the child effect ran before the parent had
  // cleared `content`, leaving the previous section's text visible in empty sections.
  useEffect(() => {
    if (!editor) return
    // Editor represents an empty doc as '<p></p>'; treat that as equal to ''.
    const current = editor.getHTML()
    const normalizedCurrent = current === '<p></p>' ? '' : current
    if ((content || '') !== normalizedCurrent) {
      editor.commands.setContent(content || '', { emitUpdate: false })
    }
  }, [content, editor])

  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const count = wordCount(content)
  const isOver = limit > 0 && count > limit
  const isEmpty = plainText.length < 10

  const runAiAction = async (action: string) => {
    if (!editor || aiAction) return
    const { from, to } = editor.state.selection
    if (from === to) return
    const selectedText = editor.state.doc.textBetween(from, to, ' ')
    if (!selectedText.trim()) return
    setAiAction(action)
    try {
      const { apiFetch } = await import('@/lib/api-fetch')
      const res = await apiFetch('/api/ai-edit', { method: 'POST', body: JSON.stringify({ text: selectedText, action }) })
      const data = await res.json()
      if (data.result) {
        editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, data.result).run()
      }
    } catch {}
    setAiAction(null)
  }

  const suggestKeywords = async () => {
    if (!plainText || keywordsLoading) return
    setKeywordsLoading(true)
    setKeywords([])
    try {
      const { apiFetch } = await import('@/lib/api-fetch')
      const res = await apiFetch('/api/keywords', { method: 'POST', body: JSON.stringify({ abstract: content }) })
      const data = await res.json()
      if (data.keywords) {
        setKeywords(data.keywords)
        onKeywordsGenerated?.(data.keywords)
      }
    } catch {}
    setKeywordsLoading(false)
  }

  const copyKeyword = (kw: string) => {
    navigator.clipboard.writeText(kw)
    setCopiedKw(kw)
    setTimeout(() => setCopiedKw(null), 1500)
  }

  const copyAllKeywords = () => {
    navigator.clipboard.writeText(keywords.join('; '))
    setCopiedKw('__all__')
    setTimeout(() => setCopiedKw(null), 1500)
  }

  const copyToClipboard = useCallback(async () => {
    if (!plainText) return
    await navigator.clipboard.writeText(plainText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [plainText])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); onSave?.() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSave])

  useEffect(() => {
    if (reviewData && panelRef.current) panelRef.current.scrollTop = 0
  }, [reviewData])

  const canReview = plainText.length >= 20

  return (
    <div className="editor-root" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

      {/* ── Left: Editor ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#f0e8d0', letterSpacing: '-0.4px', margin: 0 }}>
            {selectedSection}
          </h2>
          <span style={{ fontSize: 12, color: saving ? '#c9943a' : 'rgba(240,232,208,0.3)', fontWeight: saving ? 600 : 400, transition: 'color 0.3s' }}>
            {saving ? '● Saving…' : '✓ Autosaved'}
          </span>
        </div>

        {/* Section guidance — shown when empty */}
        {isEmpty && guidance && (
          <div style={{
            marginBottom: 16, padding: '18px 20px', borderRadius: 14,
            background: 'rgba(201,148,58,0.05)', border: '1px solid rgba(201,148,58,0.18)',
            animation: 'fadeIn 0.4s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: '#c9943a' }}>✦</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#c9943a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Mentor Guidance — {selectedSection}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.6)', marginBottom: 12, lineHeight: 1.6 }}>
              {guidance.what}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {guidance.structure.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, color: '#c9943a', fontWeight: 700, marginTop: 3, flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ fontSize: 12.5, color: 'rgba(240,232,208,0.55)', lineHeight: 1.55 }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(201,148,58,0.08)', border: '1px solid rgba(201,148,58,0.15)' }}>
              <span style={{ fontSize: 11, color: 'rgba(201,148,58,0.8)' }}>💡 <strong>Tip:</strong> {guidance.tip}</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <button
            onClick={onReview}
            disabled={reviewing || !canReview}
            title={!canReview ? 'Write at least 20 characters first' : 'Get mentor feedback on what you\'ve written'}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 10,
              background: reviewing ? 'rgba(201,148,58,0.15)' : !canReview ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #c9943a, #e8b84a)',
              color: reviewing || !canReview ? 'rgba(201,148,58,0.5)' : '#080c18',
              border: reviewing || !canReview ? '1px solid rgba(201,148,58,0.2)' : 'none',
              fontSize: 13, fontWeight: 700,
              cursor: reviewing || !canReview ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {reviewing ? (
              <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>◌</span> Mentor is reading…</>
            ) : (
              <><span>✦</span> Get Mentor Feedback</>
            )}
          </button>

          <button onClick={copyToClipboard} disabled={!plainText}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 10,
              background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
              border: copied ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.08)',
              color: copied ? '#34d399' : !plainText ? 'rgba(240,232,208,0.2)' : 'rgba(240,232,208,0.6)',
              fontSize: 13, fontWeight: 500, cursor: !plainText ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            }}>
            <span>{copied ? '✓' : '⎘'}</span> {copied ? 'Copied!' : 'Copy'}
          </button>

          {isAbstract && (
            <button onClick={suggestKeywords} disabled={keywordsLoading || !plainText}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 10,
                background: 'rgba(99,179,237,0.06)', border: '1px solid rgba(99,179,237,0.2)',
                color: keywordsLoading || !plainText ? 'rgba(99,179,237,0.3)' : 'rgba(99,179,237,0.8)',
                fontSize: 13, fontWeight: 600, cursor: keywordsLoading || !plainText ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}>
              {keywordsLoading
                ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>◌</span> Suggesting…</>
                : <><span>🏷</span> Suggest Keywords</>}
            </button>
          )}
        </div>

        {/* ── Toolbar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
          padding: '8px 12px', borderRadius: '14px 14px 0 0',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)',
          borderBottom: 'none',
        }}>
          <ToolbarBtn title="Bold (⌘B)" active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}>B</ToolbarBtn>
          <ToolbarBtn title="Italic (⌘I)" active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}><em>I</em></ToolbarBtn>
          <ToolbarBtn title="Underline (⌘U)" active={editor?.isActive('underline')} onClick={() => editor?.chain().focus().toggleUnderline().run()}><u>U</u></ToolbarBtn>
          <ToolbarBtn title="Superscript — for citation numbers [1]" active={editor?.isActive('superscript')} onClick={() => editor?.chain().focus().toggleSuperscript().run()}>x²</ToolbarBtn>
          <ToolbarDivider />
          <div style={{ position: 'relative' }}>
            <ToolbarBtn
              title="List"
              active={editor?.isActive('bulletList') || editor?.isActive('orderedList')}
              onClick={() => {
                const el = document.getElementById('list-menu')
                if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'
              }}
            >☰ List ▾</ToolbarBtn>
            <div id="list-menu" style={{
              display: 'none', position: 'absolute', top: '100%', left: 0, zIndex: 100, marginTop: 4,
              background: '#0d1120', border: '1px solid rgba(201,148,58,0.3)', borderRadius: 10,
              minWidth: 160, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden',
            }}>
              {[
                { label: '• Bullet List', action: () => editor?.chain().focus().toggleBulletList().run() },
                { label: '1. Numbered List', action: () => editor?.chain().focus().toggleOrderedList().run() },
              ].map(item => (
                <button key={item.label} onMouseDown={e => { e.preventDefault(); item.action(); const el = document.getElementById('list-menu'); if (el) el.style.display = 'none' }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px',
                    background: 'none', border: 'none', color: 'rgba(240,232,208,0.7)', fontSize: 13,
                    cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,148,58,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >{item.label}</button>
              ))}
            </div>
          </div>
          <ToolbarDivider />
          <ToolbarBtn
            title="Insert table"
            onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >⊞ Table</ToolbarBtn>
          {editor?.isActive('table') && <>
            <ToolbarBtn title="Add column after" onClick={() => editor.chain().focus().addColumnAfter().run()}>+Col</ToolbarBtn>
            <ToolbarBtn title="Add row after" onClick={() => editor.chain().focus().addRowAfter().run()}>+Row</ToolbarBtn>
            <ToolbarBtn title="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()}>−Col</ToolbarBtn>
            <ToolbarBtn title="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>−Row</ToolbarBtn>
            <ToolbarBtn title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>✕ Table</ToolbarBtn>
          </>}
          <ToolbarDivider />
          {/* Table Templates */}
          <div style={{ position: 'relative' }}>
            <ToolbarBtn title="Insert table" onClick={() => setShowTableMenu(v => !v)}>⊞ Insert Table ▾</ToolbarBtn>
            {showTableMenu && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, zIndex: 100, marginTop: 4,
                background: '#0d1120', border: '1px solid rgba(201,148,58,0.3)', borderRadius: 10,
                minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden',
              }}>
                {TABLE_TEMPLATES.map(t => (
                  <button key={t.label} onMouseDown={e => { e.preventDefault(); insertTableTemplate(t) }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px',
                      background: 'none', border: 'none', color: 'rgba(240,232,208,0.7)', fontSize: 13,
                      cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,148,58,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >{t.label}</button>
                ))}
              </div>
            )}
          </div>
          <ToolbarDivider />
          <ToolbarBtn title="Insert citation superscript [n]" onClick={insertCitation}>¹ Citation</ToolbarBtn>
          <ToolbarBtn title="Insert figure placeholder" onClick={insertFigure}>🖼 Figure</ToolbarBtn>
        </div>

        {/* ── TipTap Editor ── */}
        <div
          className="tiptap-wrapper"
          style={{
            minHeight: 460, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)', borderRadius: '0 0 14px 14px',
            padding: '20px 24px', cursor: 'text',
          }}
          onClick={() => editor?.commands.focus()}
        >
          {isEmpty && !editor?.isFocused && (
            <p style={{
              position: 'absolute', pointerEvents: 'none',
              fontSize: 15, color: 'rgba(240,232,208,0.25)', lineHeight: 1.75, margin: 0,
            }}>
              {guidance ? `Start writing your ${selectedSection.toLowerCase()} here…` : `Write ${selectedSection.toLowerCase()} here…`}
            </p>
          )}
          {/* ── AI Bubble Menu on text selection ── */}
          {editor && (
            <BubbleMenu editor={editor}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: '#0d1120', border: '1px solid rgba(201,148,58,0.4)',
                borderRadius: 10, padding: '5px 6px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}>
                {aiAction ? (
                  <span style={{ fontSize: 12, color: '#c9943a', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span>
                    {aiAction === 'improve' ? 'Improving…' : aiAction === 'shorten' ? 'Shortening…' : aiAction === 'expand' ? 'Expanding…' : aiAction === 'journal' ? 'Styling…' : 'Checking…'}
                  </span>
                ) : (
                  <>
                    {[
                      { key: 'improve', label: '✦ Improve', title: 'Improve academic writing' },
                      { key: 'shorten', label: '↙ Shorten', title: 'Shorten the text' },
                      { key: 'expand',  label: '↗ Expand',  title: 'Expand with more detail' },
                      { key: 'journal', label: '📄 Journal Style', title: 'Rewrite in journal-ready style' },
                      { key: 'grammar', label: '✓ Grammar', title: 'Fix grammar and spelling' },
                    ].map(({ key, label, title }) => (
                      <button key={key} onClick={() => runAiAction(key)} title={title} style={{
                        padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                        background: 'transparent', color: 'rgba(240,232,208,0.75)',
                        fontSize: 12, fontWeight: 600, transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,148,58,0.15)'; e.currentTarget.style.color = '#e8b84a' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(240,232,208,0.75)' }}
                      >{label}</button>
                    ))}
                  </>
                )}
              </div>
            </BubbleMenu>
          )}
          <EditorContent editor={editor} />
        </div>

        {/* Word count */}
        <div style={{ marginTop: 10, padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: limit > 0 ? 6 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: isOver ? '#f87171' : 'rgba(240,232,208,0.35)', fontWeight: isOver ? 600 : 400 }}>
                {count.toLocaleString()} {limit > 0 ? `/ ${limit.toLocaleString()} words` : 'words'}
              </span>
              {isJournalLimit && limit > 0 && (
                <span style={{ fontSize: 10, color: 'rgba(201,148,58,0.5)', background: 'rgba(201,148,58,0.08)', border: '1px solid rgba(201,148,58,0.2)', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>
                  journal limit
                </span>
              )}
            </div>
            {isOver && <span style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>{(count - limit).toLocaleString()} over limit</span>}
            {limit > 0 && !isOver && count > 0 && <span style={{ fontSize: 12, color: 'rgba(240,232,208,0.3)' }}>{(limit - count).toLocaleString()} remaining</span>}
          </div>
          {limit > 0 && (
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: `${Math.min((count / limit) * 100, 100)}%`,
                background: isOver ? '#f87171' : count / limit > 0.85 ? '#f59e0b' : isJournalLimit ? '#c9943a' : '#60a5fa',
                transition: 'width 0.3s ease, background 0.3s ease',
              }} />
            </div>
          )}
        </div>

        {/* Keyword suggestions */}
        {isAbstract && keywords.length > 0 && (
          <div style={{ marginTop: 16, padding: '16px 20px', borderRadius: 12, background: 'rgba(99,179,237,0.05)', border: '1px solid rgba(99,179,237,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(99,179,237,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>🏷 AI-Suggested Keywords</span>
                <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)' }}>MeSH-aligned</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', padding: '3px 10px', borderRadius: 20 }}>
                ✓ Saved to export
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {keywords.map(kw => (
                <span key={kw} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, background: 'rgba(99,179,237,0.08)', border: '1px solid rgba(99,179,237,0.2)', color: 'rgba(99,179,237,0.8)' }}>
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Mentor Feedback Panel ── */}
      {(reviewData || reviewing) && (
        <div className="editor-review-panel" style={{ width: 340, flexShrink: 0 }}>
          <div ref={panelRef} style={{
            width: '100%', maxHeight: 620, overflowY: 'auto',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(201,148,58,0.2)',
            borderRadius: 18, padding: '20px 18px',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>

            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: '#c9943a' }}>✦</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f0e8d0', letterSpacing: '0.02em' }}>Mentor Feedback</span>
              </div>
              <button onClick={onCloseReview}
                style={{ background: 'none', border: 'none', color: 'rgba(240,232,208,0.3)', fontSize: 18, cursor: 'pointer', padding: '2px 6px', borderRadius: 6 }}>×</button>
            </div>

            {/* Loading */}
            {reviewing && !reviewData && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 14, padding: '40px 0' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(201,148,58,0.15)', borderTopColor: '#c9943a', animation: 'spin 0.9s linear infinite' }}/>
                <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', textAlign: 'center', lineHeight: 1.6 }}>
                  Your mentor is reading your {selectedSection.toLowerCase()}…
                </p>
              </div>
            )}

            {/* Results */}
            {reviewData && (
              <>
                {/* Score + summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <ScoreRing score={reviewData.score} />
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Section Score</div>
                    <div style={{ fontSize: 12, color: 'rgba(240,232,208,0.6)', lineHeight: 1.55 }}>{reviewData.summary}</div>
                  </div>
                </div>

                {/* Mentor note */}
                {reviewData.mentor_note && (
                  <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(201,148,58,0.06)', border: '1px solid rgba(201,148,58,0.18)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(201,148,58,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>✦ Mentor Note</div>
                    <p style={{ fontSize: 12.5, color: 'rgba(240,232,208,0.65)', lineHeight: 1.65, margin: 0 }}>{reviewData.mentor_note}</p>
                  </div>
                )}

                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }}/>

                {/* Issues */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(240,232,208,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>Detailed Feedback</p>
                  {reviewData.issues.map((issue, i) => {
                    const cfg = ISSUE_CONFIG[issue.type]
                    return (
                      <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: cfg.color, fontWeight: 800, flexShrink: 0 }}>{cfg.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#f0e8d0' }}>{issue.title}</span>
                        </div>
                        <p style={{ fontSize: 11.5, color: 'rgba(240,232,208,0.55)', lineHeight: 1.65, margin: 0 }}>{issue.detail}</p>
                        {issue.question && (
                          <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.45)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>🤔 {issue.question}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Re-review */}
                <button onClick={onReview} disabled={reviewing}
                  style={{ width: '100%', padding: '9px 0', borderRadius: 10, marginTop: 4, background: 'rgba(201,148,58,0.08)', border: '1px solid rgba(201,148,58,0.2)', color: '#c9943a', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,148,58,0.14)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201,148,58,0.08)')}>
                  ↺ Re-read my revision
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

        /* ── TipTap editor styles ── */
        .tiptap-wrapper { position: relative; }
        .tiptap-editor { outline: none; min-height: 420px; }
        .tiptap-editor p { margin: 0 0 10px; font-size: 15px; line-height: 1.75; color: #f0e8d0; font-family: Inter, system-ui, sans-serif; }
        .tiptap-editor p:last-child { margin-bottom: 0; }
        .tiptap-editor ul, .tiptap-editor ol { padding-left: 22px; margin: 0 0 10px; color: #f0e8d0; font-size: 15px; line-height: 1.75; }
        .tiptap-editor li { margin-bottom: 4px; }
        .tiptap-editor strong { font-weight: 700; color: #f0e8d0; }
        .tiptap-editor em { font-style: italic; }
        .tiptap-editor u { text-decoration: underline; }
        .tiptap-editor sup { font-size: 0.75em; vertical-align: super; color: #c9943a; font-weight: 600; }

        /* Table styles */
        .tiptap-editor table { border-collapse: collapse; width: 100%; margin: 14px 0; border-radius: 8px; overflow: hidden; }
        .tiptap-editor th { background: rgba(201,148,58,0.12); color: #e8b84a; font-weight: 700; font-size: 13px; padding: 10px 14px; text-align: left; border: 1px solid rgba(255,255,255,0.1); }
        .tiptap-editor td { padding: 9px 14px; font-size: 14px; color: rgba(240,232,208,0.8); border: 1px solid rgba(255,255,255,0.08); vertical-align: top; }
        .tiptap-editor tr:nth-child(even) td { background: rgba(255,255,255,0.02); }
        .tiptap-editor .selectedCell { background: rgba(201,148,58,0.1) !important; }

        .tiptap-wrapper:focus-within { outline: none; }
        .tiptap-wrapper:focus-within + * { border-color: rgba(201,148,58,0.35); }

        @media (max-width: 768px) {
          .editor-root { flex-direction: column !important; }
          .editor-review-panel { width: 100% !important; }
          .editor-review-panel > div { width: 100% !important; height: auto !important; max-height: 520px; }
        }
      `}</style>
    </div>
  )
}
