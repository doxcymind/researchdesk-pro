'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api-fetch'

import { useSessionGuard } from '@/lib/hooks/useSessionGuard'
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
  const { isScholar } = useSubscription()
  const contentRef = useRef<HTMLElement>(null)

  const autosaveTimeout = useRef<NodeJS.Timeout | null>(null)

  const MANUSCRIPT_SECTIONS: Record<string, string[]> = {
    'Case Report':       ['Abstract', 'Introduction', 'Case Presentation', 'Discussion', 'Conclusion', 'References'],
    'Case Series':       ['Abstract', 'Introduction', 'Case Presentations', 'Discussion', 'Conclusion', 'References'],
    'Original Study':    ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References'],
    'Review Article':    ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References'],
    'Systematic Review': ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References'],
    'Meta-Analysis':     ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References'],
    'Thesis':            ['Abstract', 'Introduction', 'Literature Review', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References'],
    'Letter to Editor':  ['Abstract', 'Body', 'References'],
    'Audit':             ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'Recommendations', 'References'],
  }

  const DEFAULT_SECTIONS = ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'References']

  const manuscriptSections = project
    ? (MANUSCRIPT_SECTIONS[project.study_type] ?? DEFAULT_SECTIONS)
    : DEFAULT_SECTIONS

  const TOOL_SECTIONS = ['Authors', 'Uploads', 'Citation Generator', 'Submission Checklist', 'Journal Selector', 'Rejection Tracker', 'AI Assistant', 'Clinical Trials', 'DOI Resolver']

  const sections = ['Overview', ...manuscriptSections, ...TOOL_SECTIONS]

  useEffect(() => {
    fetchProject()
  }, [])

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
      const {
        data: { user },
      } = await supabase.auth.getUser()

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
        console.log(error)
        alert('Project not found')
        router.push('/projects')
        return
      }

      setProject(data)
    } catch (error) {
      console.log(error)
      router.push('/projects')
    } finally {
      setLoading(false)
    }
  }

  const fetchSectionContent = async () => {
    if (!project) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

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
  }

  const saveContent = async (
    valueToSave?: string
  ) => {
    if (!project) return

    setSaving(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

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
    } catch (error) {
      console.log(error)
    } finally {
      setSaving(false)
    }
  }

  const handleContentChange = (value: string) => {
    setContent(value)

    if (autosaveTimeout.current) {
      clearTimeout(autosaveTimeout.current)
    }

    autosaveTimeout.current = setTimeout(() => {
      saveContent(value)
    }, 1500)
  }

  const deleteProject = async () => {
    if (!project) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { alert('Not signed in'); return }

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
      alert(`Failed to delete: ${data.error}`)
      return
    }
    router.push('/projects')
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
        await logActivity(
          `Generated draft for ${selectedSection}`
        )
      } else {
        alert('Generation failed')
      }
    } catch (error) {
      console.log(error)
      alert('Something went wrong')
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
      if (data.error) { alert(data.error); return }
      setReviewData(data)
      await logActivity(`AI reviewed ${selectedSection}`)
    } catch (error) {
      console.log(error)
      alert('Review failed')
    } finally {
      setReviewing(false)
    }
  }

  const exportManuscript = async () => {
    if (!project) return
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
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.title.replace(/\s+/g, '_')}_manuscript.docx`
    a.click()
    URL.revokeObjectURL(url)
    await logActivity('Exported manuscript')
  }

  const shareManuscript = async () => {
    if (!project) return
    const res = await apiFetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project.id }),
    })
    const data = await res.json()
    if (data.url) {
      const fullUrl = `${window.location.origin}${data.url}`
      await navigator.clipboard.writeText(fullUrl)
      alert(`Share link copied!\n\n${fullUrl}`)
    }
  }

  const logActivity = async (action: string) => {
    if (!project) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from('activity_logs').insert({
      project_id: project.id,
      user_id: user.id,
      action,
    })
  }

  const NON_EDITOR = new Set(['Overview', 'Authors', 'Uploads', 'Citation Generator', 'Submission Checklist', 'Journal Selector', 'Rejection Tracker', 'AI Assistant', 'Clinical Trials', 'DOI Resolver'])
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
                />
              )}

              {selectedSection === 'Uploads' && (
                <UploadsPanel projectId={project.id} />
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
            </div>
          </>
        )}
        {/* Upgrade modal */}
        {upgradeFeature && (
          <UpgradeModal feature={upgradeFeature} onClose={() => setUpgradeFeature(null)} />
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