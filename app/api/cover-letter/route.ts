import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { geminiChat } from '@/lib/gemini'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.slice(7)
    )
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, projectTitle, studyType, summary } = await req.json()

    // Fetch authors
    const { data: authorsRow } = await supabaseAdmin
      .from('project_sections')
      .select('content')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('section', '__authors__')
      .single()

    // Fetch target journal
    const { data: journalRow } = await supabaseAdmin
      .from('project_sections')
      .select('content')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('section', '__target_journal__')
      .single()

    let authors: { name: string; email: string; affiliation: string; corresponding: boolean }[] = []
    try { authors = authorsRow?.content ? JSON.parse(authorsRow.content) : [] } catch {}

    const journal = journalRow?.content || 'the journal'
    const correspondingAuthor = authors.find(a => a.corresponding) || authors[0]
    const authorList = authors.map(a => a.name).filter(Boolean).join(', ')

    const systemPrompt = `You are an expert academic writing assistant specializing in cover letters for medical journal submissions. Write professional, concise, and compelling cover letters.`

    const userMessage = `Write a professional cover letter for the following manuscript submission:

Title: ${projectTitle}
Study Type: ${studyType}
Target Journal: ${journal}
Authors: ${authorList || 'Author names not provided'}
Corresponding Author: ${correspondingAuthor?.name || 'Not specified'}${correspondingAuthor?.email ? ` (${correspondingAuthor.email})` : ''}
${correspondingAuthor?.affiliation ? `Affiliation: ${correspondingAuthor.affiliation}` : ''}

Manuscript Summary:
${summary || 'Please write a standard cover letter based on the manuscript title and study type.'}

Requirements:
- Address it to the Editor-in-Chief of ${journal}
- Include: statement of originality, why this journal is appropriate, brief significance of findings, confirmation that all authors approved submission, no competing interests statement
- Professional academic tone
- 3-4 paragraphs, ~300 words
- End with "Sincerely," and space for the corresponding author's signature
- Do NOT use placeholder brackets like [Your Name] — use the actual author info provided
`

    const letter = await geminiChat(systemPrompt, userMessage)

    return NextResponse.json({ letter })
  } catch (err) {
    console.error('cover-letter error:', err)
    return NextResponse.json({ error: 'Failed to generate cover letter' }, { status: 500 })
  }
}
