'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Submission {
  id: number
  journal_name: string
  submitted_at: string
  status: string
  notes: string
}

interface Props {
  projectId: number
}

const STATUS_OPTIONS = [
  'Submitted',
  'Under Review',
  'Rejected',
  'Revision Requested',
  'Accepted',
]

const STATUS_COLORS: Record<string, string> = {
  Submitted: 'text-blue-400 bg-blue-400/10',
  'Under Review': 'text-yellow-400 bg-yellow-400/10',
  Rejected: 'text-red-400 bg-red-400/10',
  'Revision Requested': 'text-orange-400 bg-orange-400/10',
  Accepted: 'text-green-400 bg-green-400/10',
}

export default function RejectionTracker({
  projectId,
}: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [journalName, setJournalName] = useState('')
  const [submittedAt, setSubmittedAt] = useState('')
  const [status, setStatus] = useState('Submitted')
  const [notes, setNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    const { data } = await supabase
      .from('journal_submissions')
      .select('*')
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false })

    if (data) setSubmissions(data)
  }

  const addSubmission = async () => {
    setFormError(null)
    if (!journalName || !submittedAt) {
      setFormError('Journal name and date are required')
      return
    }

    setAdding(true)

    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return

    const { error } = await supabase
      .from('journal_submissions')
      .insert({
        project_id: projectId,
        user_id: user.id,
        journal_name: journalName,
        submitted_at: submittedAt,
        status,
        notes,
      })

    if (!error) {
      setJournalName('')
      setSubmittedAt('')
      setStatus('Submitted')
      setNotes('')
      setShowForm(false)
      await fetchSubmissions()
    }

    setAdding(false)
  }

  const updateStatus = async (id: number, newStatus: string) => {
    await supabase
      .from('journal_submissions')
      .update({ status: newStatus })
      .eq('id', id)

    fetchSubmissions()
  }

  const deleteSubmission = async (id: number) => {
    await supabase
      .from('journal_submissions')
      .delete()
      .eq('id', id)

    fetchSubmissions()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">
          Journal Submission Tracker
        </h2>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-white text-black px-5 py-3 rounded-xl font-semibold hover:opacity-90"
        >
          {showForm ? 'Cancel' : '+ Add Submission'}
        </button>
      </div>

      {showForm && (
        <div className="bg-zinc-800 rounded-2xl p-6 space-y-4">
          <input
            type="text"
            placeholder="Journal Name (e.g. BMJ Case Reports)"
            value={journalName}
            onChange={(e) => setJournalName(e.target.value)}
            className="w-full bg-zinc-700 p-3 rounded-xl outline-none"
          />

          <input
            type="date"
            value={submittedAt}
            onChange={(e) => setSubmittedAt(e.target.value)}
            className="w-full bg-zinc-700 p-3 rounded-xl outline-none"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-zinc-700 p-3 rounded-xl outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <textarea
            placeholder="Notes (optional) — e.g. reviewer comments, reasons for rejection"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-zinc-700 p-3 rounded-xl outline-none resize-none h-24"
          />

          {formError && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontSize: 12 }}>
              {formError}
            </div>
          )}

          <button
            onClick={addSubmission}
            disabled={adding}
            className="w-full bg-white text-black p-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {adding ? 'Saving...' : 'Save Submission'}
          </button>
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="bg-zinc-800 rounded-2xl p-10 text-center">
          <p className="text-zinc-500 text-lg">
            No submissions yet. Track your first journal submission above.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="bg-zinc-800 rounded-2xl p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-semibold">
                    {sub.journal_name}
                  </h3>
                  <p className="text-zinc-500 text-sm mt-1">
                    Submitted: {new Date(sub.submitted_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[sub.status]}`}>
                    {sub.status}
                  </span>

                  <button
                    onClick={() => deleteSubmission(sub.id)}
                    className="text-zinc-600 hover:text-red-400 transition text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {sub.notes && (
                <p className="text-zinc-400 text-sm mb-4">
                  {sub.notes}
                </p>
              )}

              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(sub.id, s)}
                    className={`px-3 py-1 rounded-lg text-sm transition ${
                      sub.status === s
                        ? 'bg-white text-black font-semibold'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}