'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api-fetch'

interface Upload {
  id: number
  file_name: string
  file_path: string
  file_size: number
}

interface UploadsPanelProps {
  projectId: number
  projectTitle?: string
  studyType?: string
}

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Keywords per category used to auto-match uploaded filenames
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Clinical History':  ['history', 'symptom', 'complaint', 'admission', 'clinical', 'hx', 'patient'],
  'Radiology':         ['ct', 'mri', 'xray', 'x-ray', 'ultrasound', 'scan', 'radio', 'imaging', 'pet', 'ecg', 'echo'],
  'Histopathology':    ['histo', 'biopsy', 'pathol', 'specimen', 'microscop', 'tissue', 'hpe'],
  'Laboratory':        ['lab', 'blood', 'cbc', 'serum', 'culture', 'test', 'report', 'result', 'biochem'],
  'Clinical Images':   ['photo', 'image', 'intraop', 'operative', 'picture', 'figure', 'img'],
  'Operative Notes':   ['op note', 'opnote', 'operative', 'surgery', 'surgical', 'procedure', 'operation'],
  'Literature':        ['paper', 'article', 'reference', 'journal', 'pubmed', 'study', 'review'],
  'Consent & Ethics':  ['consent', 'ethics', 'irb', 'ethical', 'approval'],
}

function matchCategory(fileName: string): string | null {
  const lower = fileName.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return cat
  }
  return null
}

export default function UploadsPanel({ projectId, projectTitle, studyType }: UploadsPanelProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null)
  const [dragOver, setDragOver]   = useState(false)
  const [files, setFiles]         = useState<Upload[]>([])
  const [loading, setLoading]     = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<{ category: string; label: string }[]>([])
  const [sugLoading, setSugLoading]   = useState(false)
  const [sugFailed, setSugFailed]     = useState(false)
  const inputRef        = useRef<HTMLInputElement>(null)
  const categoryRef     = useRef<string | null>(null)

  useEffect(() => { fetchFiles() }, [])

  useEffect(() => {
    if (projectTitle) fetchSuggestions()
  }, [projectTitle])

  const fetchSuggestions = async () => {
    if (!projectTitle) return
    setSugLoading(true)
    setSugFailed(false)
    try {
      const res  = await apiFetch('/api/uploads/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: projectTitle, studyType }),
      })
      const data = await res.json()
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setSuggestions(data.suggestions)
      } else {
        setSugFailed(true)
      }
    } catch {
      setSugFailed(true)
    }
    setSugLoading(false)
  }

  const fetchFiles = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return

    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)          // ← privacy fix: only fetch own files
      .order('created_at', { ascending: false })

    if (!error && data) setFiles(data)
    setLoading(false)
  }

  const handleFile = async (file: File, category?: string) => {
    setPanelError(null)
    const resolvedCategory = category || categoryRef.current || matchCategory(file.name) || null
    setUploadingCategory(resolvedCategory)
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setPanelError('Only PDF files are supported')
      setUploadingCategory(null)
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setPanelError(`File too large. Maximum size is ${formatSize(MAX_FILE_SIZE)}.`)
      return
    }

    try {
      setUploading(true)

      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { setPanelError('Not logged in'); return }

      // Storage path includes user_id for proper isolation
      const filePath = `${user.id}/${projectId}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('research-files').upload(filePath, file)
      if (uploadError) { setPanelError('Upload failed: ' + uploadError.message); return }

      await supabase.from('uploads').insert({
        project_id: projectId,
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
      })
      await supabase.from('activity_logs').insert({
        project_id: projectId,
        user_id: user.id,
        action: `Uploaded file: ${file.name}`,
      })
      await fetchFiles()
    } catch (e) {
      console.error(e)
      setPanelError('Something went wrong. Please try again.')
    } finally {
      setUploading(false)
      setUploadingCategory(null)
      categoryRef.current = null
    }
  }

  const openFile = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('research-files').createSignedUrl(filePath, 60)
    if (error || !data?.signedUrl) { setPanelError('Could not open file'); return }
    window.open(data.signedUrl, '_blank')
  }

  const deleteFile = async (upload: Upload) => {
    if (!confirm(`Delete "${upload.file_name}"? This cannot be undone.`)) return
    setDeletingId(upload.id)
    try {
      // Remove from storage
      await supabase.storage.from('research-files').remove([upload.file_path])
      // Remove from DB
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (user) await supabase.from('uploads').delete().eq('id', upload.id).eq('user_id', user.id)
      setFiles(prev => prev.filter(f => f.id !== upload.id))
    } catch (e) {
      console.error(e)
      setPanelError('Failed to delete file')
    } finally {
      setDeletingId(null)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {panelError && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{panelError}</span>
          <button onClick={() => setPanelError(null)} style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.6)', cursor: 'pointer', fontSize: 14, padding: 0, marginLeft: 12 }}>✕</button>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#f0e8d0', letterSpacing: '-0.4px', margin: '0 0 6px' }}>Uploads</h2>
        <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.35)', margin: 0 }}>
          Upload research PDFs to reference while writing · Max {formatSize(MAX_FILE_SIZE)} per file
        </p>
      </div>

      {/* Upload Progress Bars */}
      <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(201,148,58,0.04)', border: '1px solid rgba(201,148,58,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e8b84a' }}>✦ What to upload</span>
            <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)' }}>Click any row to upload · AI-powered</span>
          </div>
          {sugLoading && <span style={{ fontSize: 11, color: 'rgba(201,148,58,0.4)' }}>Analysing…</span>}
          {!sugLoading && suggestions.length > 0 && (
            <button onClick={fetchSuggestions} style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>↺ Refresh</button>
          )}
        </div>

        {sugLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 48, borderRadius: 10, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
          </div>
        )}

        {!sugLoading && suggestions.length > 0 && (() => {
          const ICON: Record<string, string> = {
            'Radiology': '🔬', 'Histopathology': '🧫', 'Laboratory': '🧪',
            'Clinical History': '📋', 'Clinical Images': '📸', 'Operative Notes': '🔪',
            'Literature': '📖', 'Consent & Ethics': '📝',
          }
          const COLOR: Record<string, string> = {
            'Radiology': '#63b3ed', 'Histopathology': '#a78bfa', 'Laboratory': '#34d399',
            'Clinical History': '#e8b84a', 'Clinical Images': '#f97316', 'Operative Notes': '#f87171',
            'Literature': '#d1d5db', 'Consent & Ethics': '#34d399',
          }
          const uploadedCategories = new Set(files.map(f => matchCategory(f.file_name)).filter(Boolean))
          const doneCount = suggestions.filter(s => uploadedCategories.has(s.category)).length
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Overall progress */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.4)' }}>{doneCount} of {suggestions.length} uploaded</span>
                  <span style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', fontWeight: 700 }}>{Math.round((doneCount / suggestions.length) * 100)}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #c9943a, #e8b84a)', width: `${(doneCount / suggestions.length) * 100}%`, transition: 'width 0.5s ease' }}/>
                </div>
              </div>

              {suggestions.map((s, i) => {
                const isDone    = uploadedCategories.has(s.category)
                const isLoading = uploadingCategory === s.category
                const color     = COLOR[s.category] || '#c9943a'
                const emoji     = ICON[s.category]  || '📄'
                const matchedFile = files.find(f => matchCategory(f.file_name) === s.category)

                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (!isDone && !uploading) {
                        categoryRef.current = s.category
                        inputRef.current?.click()
                      }
                    }}
                    style={{
                      position: 'relative', overflow: 'hidden', borderRadius: 11,
                      border: `1px solid ${isDone ? `${color}40` : 'rgba(255,255,255,0.07)'}`,
                      cursor: isDone ? 'default' : uploading ? 'not-allowed' : 'pointer',
                      transition: 'border-color 0.2s, transform 0.15s',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                    onMouseEnter={e => { if (!isDone && !uploading) { e.currentTarget.style.borderColor = `${color}60`; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = isDone ? `${color}40` : 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = '' }}
                  >
                    {/* Fill bar background */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: isDone ? `${color}18` : 'transparent',
                      width: isDone ? '100%' : isLoading ? '60%' : '0%',
                      transition: 'width 0.6s ease, background 0.3s',
                      borderRadius: 10,
                    }}/>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px' }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: isDone ? color : 'rgba(240,232,208,0.35)', display: 'block', marginBottom: 2 }}>{s.category}</span>
                        <span style={{ fontSize: 13, color: isDone ? 'rgba(240,232,208,0.8)' : 'rgba(240,232,208,0.5)', lineHeight: 1.4 }}>
                          {isLoading ? 'Uploading…' : isDone ? matchedFile?.file_name || s.label : s.label}
                        </span>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {isLoading ? (
                          <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${color}40`, borderTopColor: color, animation: 'spin 0.8s linear infinite' }}/>
                        ) : isDone ? (
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${color}20`, border: `1.5px solid ${color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color }}>✓</div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.2)', padding: '3px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)' }}>Upload</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {!sugLoading && sugFailed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.25)', margin: 0 }}>Could not load suggestions.</p>
            <button onClick={fetchSuggestions} style={{ fontSize: 11, color: '#e8b84a', background: 'none', border: '1px solid rgba(201,148,58,0.25)', borderRadius: 8, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>↺ Retry</button>
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragOver ? 'rgba(201,148,58,0.6)' : 'rgba(201,148,58,0.2)'}`,
          borderRadius: 16, padding: '48px 32px', textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: dragOver ? 'rgba(201,148,58,0.06)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.2s',
        }}
      >
        {uploading ? (
          <>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(201,148,58,0.15)', borderTopColor: '#c9943a', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }}/>
            <p style={{ fontSize: 14, color: 'rgba(240,232,208,0.5)', margin: 0 }}>Uploading…</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.5 }}>↑</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(240,232,208,0.7)', margin: '0 0 6px' }}>
              {dragOver ? 'Drop to upload' : 'Drag & drop a PDF here'}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.3)', margin: '0 0 20px' }}>or click to browse files · PDF only · max 20 MB</p>
            <div style={{ display: 'inline-block', padding: '9px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #c9943a, #e8b84a)', color: '#080c18', fontSize: 13, fontWeight: 700 }}>
              Select PDF
            </div>
          </>
        )}
        <input ref={inputRef} type="file" accept=".pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, categoryRef.current || undefined); e.target.value = '' }} style={{ display: 'none' }} />
      </div>

      {/* File list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2].map(i => <div key={i} style={{ height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
        </div>
      ) : files.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
            Uploaded Files ({files.length})
          </p>
          {files.map(file => (
            <div key={file.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px', borderRadius: 12,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              transition: 'border-color 0.2s', gap: 10,
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,148,58,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(201,148,58,0.1)', border: '1px solid rgba(201,148,58,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 16 }}>📄</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#f0e8d0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.file_name}</p>
                  <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: '2px 0 0' }}>{formatSize(file.file_size)}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => openFile(file.file_path)}
                  style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(201,148,58,0.08)', border: '1px solid rgba(201,148,58,0.2)', color: '#c9943a', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,148,58,0.16)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,148,58,0.08)' }}
                >Open →</button>
                <button
                  onClick={() => deleteFile(file)}
                  disabled={deletingId === file.id}
                  title="Delete file"
                  style={{ padding: '7px 10px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(248,113,113,0.15)', color: 'rgba(248,113,113,0.4)', fontSize: 12, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(248,113,113,0.08)'; e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='rgba(248,113,113,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(248,113,113,0.4)'; e.currentTarget.style.borderColor='rgba(248,113,113,0.15)' }}
                >{deletingId === file.id ? '…' : '🗑'}</button>
              </div>
            </div>
          ))}
        </div>
      ) : !uploading ? (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(240,232,208,0.2)', margin: 0 }}>No files uploaded yet</p>
      ) : null}

      <style>{`
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
      `}</style>
    </div>
  )
}
