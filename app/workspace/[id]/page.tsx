'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api-fetch'

import { useSessionGuard } from '@/lib/hooks/useSessionGuard'
import { bumpStreak } from '@/lib/components/dashboard/DynamicDashboard'
import Sidebar from '../../../lib/components/workspace/Sidebar'
import WorkspaceHeader from '../../../lib/components/workspace/WorkspaceHeader'
import OverviewPanel from '../../../lib/components/workspace/OverviewPanel'
import EditorPanel from '../../../lib/components/workspace/EditorPanel'
import UploadsPanel from '../../../lib/components/workspace/UploadsPanel'
import AIAssistantPanel from '../../../lib/components/workspace/AIAssistantPanel'
import RejectionTracker from '../../../lib/components/workspace/RejectionTracker'
import JournalSelector from '../../../lib/components/workspace/JournalSelector'
import CitationGenerator from '../../../lib/components/workspace/CitationGenerator'
import SubmissionChecklist from '../../../lib/components/workspace/SubmissionChecklist'
import AuthorsPanel from '../../../lib/components/workspace/AuthorsPanel'
import ClinicalTrialsPanel from '../../../lib/components/workspace/ClinicalTrialsPanel'
import DOIResolverPanel from '../../../lib/components/workspace/DOIResolverPanel'
import ZoteroPanel from '../../../lib/components/workspace/ZoteroPanel'
import PlagiarismPanel from '../../../lib/components/workspace/PlagiarismPanel'
import UpgradeModal from '../../../lib/components/workspace/UpgradeModal'
import { useSubscription } from '@/lib/hooks/useSubscription'

interface Project {
  id: number
  title: string
  study_type: string
  user_id: string
  target_journal: string | null
}

export default function WorkspacePage() {
  const params = useParams()
  const router = useRouter()
  useSessionGuard()

  const [project, setProject] =
    useState<Project | null>(null)

  const [selectedSection, setSelectedSection] =
    useState('Overview')

  const [content, setContent] = useState('')

  const [saving, setSaving] = useState(false)

  const [generating, setGenerating] =
    useState(false)

  const [reviewing, setReviewing] = useState(false)
  const [reviewData, setReviewData] = useState<{ score: number; summary: string; mentor_note: string; issues: { type: 'error' | 'warning' | 'success'; title: string; detail: string; question?: string }[] } | null>(null)

  const [loading, setLoading] = useState(true)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const { isScholar } = useSubscription()
  const contentRef = useRef<HTMLElement>(null)

  const autosaveTimeout = useRef<NodeJS.Timeout | null>(null)
  const contentRef2 = useRef<string>('')   // tracks latest content for beforeunload save

  const MANUSCRIPT_SECTIONS: Record<string, string[]> = {
    'Case Report':       ['Abstract', 'Introduction', 'Case Presentation', 'Discussion', 'Conclusion', 'References', 'Plagiarism Check'],
    'Case Series':       ['Abstract', 'Introduction', 'Case Presentations', 'Discussion', 'Conclusion', 'References', 'Plagiarism Check'],
    'Original Study':    ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References', 'Plagiarism Check'],
    'Review Article':    ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References', 'Plagiarism Check'],
    'Systematic Review': ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References', 'Plagiarism Check'],
    'Meta-Analysis':     ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References', 'Plagiarism Check'],
    'Thesis':            ['Abstract', 'Introduction', 'Literature Review', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References', 'Plagiarism Check'],
    'Letter to Editor':  ['Abstract', 'Body', 'References', 'Plagiarism Check'],
    'Audit':             ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'Recommendations', 'References', 'Plagiarism Check'],
  }

  const DEFAULT_SECTIONS = ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'References', 'Plagiarism Check']

  const manuscriptSections = project
    ? (MANUSCRIPT_SECTIONS[project.study_type] ?? DEFAULT_SECTIONS)
    : DEFAULT_SECTIONS

  const TOOL_SECTIONS = ['Authors', 'Uploads', 'Citation Generator', 'Zotero', 'Submission Checklist', 'Journal Selector', 'Rejection Tracker', 'AI Assistant', 'Clinical Trials', 'DOI Resolver']

  const sections = ['Overview', ...manuscriptSections, ...TOOL_SECTIONS]

  useEffect(() => {
    fetchProject()
  }, [])

  // On browser close: stash content to localStorage as emergency backup
  // (async Supabase save cannot complete in beforeunload — browsers block it)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (contentRef2.current && project) {
        const key = `rd_draft_${project.id}_${selectedSection}`
        try { localStorage.setItem(key, contentRef2.current) } catch {}
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [project, selectedSection])

  // On next load of the same section, restore draft if newer than saved content
  useEffect(() => {
    if (!project) return
    const key = `rd_draft_${project.id}_${selectedSection}`
    const draft = localStorage.getItem(key)
    if (draft && draft !== content) {
      setContent(draft)
      localStorage.removeItem(key)
      // Persist the recovered draft immediately
      saveContent(draft)
    }
  }, [project?.id, selectedSection])

  useEffect(() => {
    if (project) {
      if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current)
      setContent('')
      setReviewData(null)
      fetchSectionContent()
    }
  }, [selectedSection, project])

  const fetchProject = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user

      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        console.error('Project not found:', error)
        router.push('/projects')
        return
      }

      setProject(data)
    } catch (error) {
      console.error(error)
      router.push('/projects')
    } finally {
      setLoading(false)
    }
  }

  const fetchSectionContent = async () => {
    if (!project) return
    try {
      const { data: { session: _s1 } } = await supabase.auth.getSession()
      const user = _s1?.user
      if (!user) return

      const { data, error } = await supabase
        .from('project_sections')
        .select('*')
        .eq('project_id', project.id)
        .eq('section', selectedSection)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        setContent('')
      } else {
        setContent(data.content)
      }
    } catch (error) {
      console.error('fetchSectionContent error:', error)
      setContent('')
    }
  }

  const saveContent = async (
    valueToSave?: string
  ) => {
    if (!project) return

    setSaving(true)

    try {
      const { data: { session: _s2 } } = await supabase.auth.getSession()
      const user = _s2?.user

      if (!user) return

      const finalContent = valueToSave ?? content

      const { data: existing } = await supabase
        .from('project_sections')
        .select('*')
        .eq('project_id', project.id)
        .eq('section', selectedSection)
        .eq('user_id', user.id)
        .single()

      if (existing) {
        await supabase
          .from('project_sections')
          .update({ content: finalContent })
          .eq('id', existing.id)
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('project_sections')
          .insert({
            project_id: project.id,
            user_id: user.id,
            section: selectedSection,
            content: finalContent,
          })
      }

      await logActivity(`Saved ${selectedSection}`)
      bumpStreak()
    } catch (error) {
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleContentChange = (value: string) => {
    setContent(value)
    contentRef2.current = value  // keep ref in sync for beforeunload

    if (autosaveTimeout.current) {
      clearTimeout(autosaveTimeout.current)
    }

    autosaveTimeout.current = setTimeout(() => {
      saveContent(value)
    }, 1500)
  }

  const deleteProject = async () => {
    if (!project) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch('/api/delete-project', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ projectId: project.id }),
      })

      const data = await res.json()
      if (!res.ok) {
        console.error('Failed to delete project:', data.error)
        return
      }
      router.push('/projects')
    } catch (error) {
      console.error('deleteProject error:', error)
    }
  }

  const generateDraft = async () => {
    if (!project) return
    if (!isScholar) { setUpgradeFeature('AI Draft Generation'); return }

    try {
      setGenerating(true)

      const response = await apiFetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: selectedSection,
          topic: project.title,
        }),
      })

      const data = await response.json()

      if (data.text) {
        setContent(data.text)
        await saveContent(data.text)
        await logActivity(`Generated draft for ${selectedSection}`)
      } else {
        console.error('Generation failed:', data.error)
      }
    } catch (error) {
      console.error('generateDraft error:', error)
    } finally {
      setGenerating(false)
    }
  }

  const reviewSection = async () => {
    if (!project || content.trim().length < 20) return
    if (!isScholar) { setUpgradeFeature('AI Peer Review'); return }
    try {
      setReviewing(true)
      const response = await apiFetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: selectedSection, topic: project.title, content }),
      })
      const data = await response.json()
      if (data.error) { console.error('Review error:', data.error); return }
      setReviewData(data)
      await logActivity(`AI reviewed ${selectedSection}`)
    } catch (error) {
      console.error('reviewSection error:', error)
    } finally {
      setReviewing(false)
    }
  }

  const saveKeywords = async (keywords: string[]) => {
    if (!project) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return
      const content = keywords.join('; ')
      const { data: existing } = await supabase
        .from('project_sections')
        .select('id')
        .eq('project_id', project.id)
        .eq('section', '__keywords__')
        .eq('user_id', user.id)
        .single()
      if (existing) {
        await supabase.from('project_sections').update({ content }).eq('id', existing.id).eq('user_id', user.id)
      } else {
        await supabase.from('project_sections').insert({ project_id: project.id, user_id: user.id, section: '__keywords__', content })
      }
    } catch {}
  }

  const exportManuscript = async () => {
    if (!project) return
    try {
      const res = await apiFetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          projectTitle: project.title,
          studyType: project.study_type,
          sections: manuscriptSections,
        }),
      })
      if (!res.ok) { console.error('Export failed:', res.status); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.title.replace(/\s+/g, '_')}_manuscript.docx`
      a.click()
      URL.revokeObjectURL(url)
      await logActivity('Exported manuscript')
    } catch (error) {
      console.error('exportManuscript error:', error)
    }
  }

  const shareManuscript = async () => {
    if (!project) return
    try {
      const res = await apiFetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      })
      const data = await res.json()
      if (data.url) {
        const fullUrl = `${window.location.origin}${data.url}`
        try { await navigator.clipboard.writeText(fullUrl) } catch {}
        setShareUrl(fullUrl)
      }
    } catch (error) {
      console.error('shareManuscript error:', error)
    }
  }

  const logActivity = async (action: string) => {
    if (!project) return

    const { data: { session: _s3 } } = await supabase.auth.getSession()
    const user = _s3?.user

    if (!user) return

    await supabase.from('activity_logs').insert({
      project_id: project.id,
      user_id: user.id,
      action,
    })
  }

  const NON_EDITOR = new Set(['Overview', 'Authors', 'Uploads', 'Citation Generator', 'Zotero', 'Submission Checklist', 'Journal Selector', 'Rejection Tracker', 'AI Assistant', 'Clinical Trials', 'DOI Resolver', 'Plagiarism Check'])
  const isEditorSection = !NON_EDITOR.has(selectedSection)

  return (
    <main className="workspace-page-root" style={{ minHeight: '100vh', background: '#080c18', color: '#f0e8d0', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'row' }}>
      <Sidebar
        sections={sections}
        selectedSection={selectedSection}
        setSelectedSection={setSelectedSection}
        onExit={() => router.push('/dashboard')}
        onDelete={deleteProject}
      />

      <section
        ref={contentRef}
        onScroll={e => setShowScrollTop((e.target as HTMLElement).scrollTop > 300)}
        style={{ flex: 1, padding: 'clamp(16px, 3vw, 36px)', overflowY: 'auto', overflowX: 'hidden', minWidth: 0, position: 'relative' }}
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'rgba(240,232,208,0.3)', fontSize: 15 }}>
            Loading workspace...
          </div>
        ) : !project ? (
          <div style={{ color: '#f87171', padding: 40 }}>Workspace not found</div>
        ) : (
          <>
            <WorkspaceHeader
              title={project.title}
              studyType={project.study_type}
              onExport={exportManuscript}
              onShare={shareManuscript}
            />

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '28px 32px', minHeight: 500 }}>
              {selectedSection === 'Overview' && (
                <OverviewPanel projectId={project.id} studyType={project.study_type} manuscriptSections={manuscriptSections} />
              )}

              {isEditorSection && (
                <EditorPanel
                  selectedSection={selectedSection}
                  content={content}
                  setContent={handleContentChange}
                  saving={saving}
                  reviewing={reviewing}
                  reviewData={reviewData}
                  onReview={reviewSection}
                  onCloseReview={() => setReviewData(null)}
                  onSave={() => saveContent()}
                  onKeywordsGenerated={saveKeywords}
                />
              )}

              {selectedSection === 'Uploads' && (
                <UploadsPanel projectId={project.id} projectTitle={project.title} studyType={project.study_type} />
              )}

              {selectedSection === 'Citation Generator' && (
                <CitationGenerator />
              )}

              {selectedSection === 'Submission Checklist' && (
                <SubmissionChecklist projectId={project.id} />
              )}

              {selectedSection === 'Authors' && (
                <AuthorsPanel projectId={project.id} />
              )}

              {selectedSection === 'Journal Selector' && (
                <JournalSelector
                  projectId={project.id}
                  currentJournal={project.target_journal ?? null}
                  studyType={project.study_type}
                />
              )}

              {selectedSection === 'Rejection Tracker' && (
                <RejectionTracker projectId={project.id} />
              )}

              {selectedSection === 'AI Assistant' && (
                isScholar ? (
                  <AIAssistantPanel
                    projectTitle={project.title}
                    studyType={project.study_type}
                    projectId={project.id}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 36 }}>✦</div>
                    <h3 style={{ fontSize: 20, color: '#f0e8d0', margin: 0 }}>AI Research Assistant</h3>
                    <p style={{ fontSize: 14, color: 'rgba(240,232,208,0.4)', maxWidth: 340, margin: 0, lineHeight: 1.6 }}>Chat with an AI that knows your manuscript, suggests citations, and helps you write better.</p>
                    <button onClick={() => setUpgradeFeature('AI Research Assistant')} style={{ marginTop: 8, padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg, #c9943a, #e8b84a)', color: '#080c18', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                      Unlock with Scholar Plan
                    </button>
                  </div>
                )
              )}

              {selectedSection === 'Clinical Trials' && (
                <ClinicalTrialsPanel />
              )}

              {selectedSection === 'DOI Resolver' && (
                <DOIResolverPanel />
              )}

              {selectedSection === 'Zotero' && (
                <ZoteroPanel />
              )}

              {selectedSection === 'Plagiarism Check' && (
                isScholar ? (
                  <PlagiarismPanel projectId={project.id} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 36 }}>⚑</div>
                    <h3 style={{ fontSize: 20, color: '#f0e8d0', margin: 0 }}>Plagiarism Check</h3>
                    <p style={{ fontSize: 14, color: 'rgba(240,232,208,0.4)', maxWidth: 340, margin: 0, lineHeight: 1.6 }}>Check your manuscript for originality with AI analysis and Copyleaks cross-referencing against global academic databases.</p>
                    <button onClick={() => setUpgradeFeature('Plagiarism Check')} style={{ marginTop: 8, padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg, #c9943a, #e8b84a)', color: '#080c18', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                      Unlock with Scholar Plan
                    </button>
                  </div>
                )
              )}
            </div>
          </>
        )}
        {/* Upgrade modal */}
        {upgradeFeature && (
          <UpgradeModal feature={upgradeFeature} onClose={() => setUpgradeFeature(null)} />
        )}

        {/* Share URL toast */}
        {shareUrl && (
          <div style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 60,
            background: 'rgba(12,16,32,0.95)', border: '1px solid rgba(201,148,58,0.35)',
            borderRadius: 12, padding: '14px 20px', color: '#f0e8d0', fontSize: 13,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)', maxWidth: 500, width: '90vw',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#c9943a' }}>
              ✓ Link copied: {shareUrl}
            </span>
            <button onClick={() => setShareUrl(null)} style={{ background: 'none', border: 'none', color: 'rgba(240,232,208,0.4)', cursor: 'pointer', fontSize: 16, padding: 0 }}>✕</button>
          </div>
        )}

        {/* Scroll-to-top */}
        {showScrollTop && (
          <button
            onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              position: 'fixed', bottom: 28, right: 28, zIndex: 50,
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(201,148,58,0.15)', border: '1px solid rgba(201,148,58,0.35)',
              color: '#c9943a', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(201,148,58,0.25)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(201,148,58,0.15)' }}
            title="Back to top"
          >↑</button>
        )}
      </section>
    </main>
  )
}