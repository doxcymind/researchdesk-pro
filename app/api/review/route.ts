import { getAuthUser } from '@/lib/auth-helper'
import { checkRateLimit } from '@/lib/rate-limit'
import { geminiChat } from '@/lib/gemini'
import { isScholarServer } from '@/lib/check-subscription'
import { createClient } from '@supabase/supabase-js'
import { extractText } from 'unpdf'

function makeSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function getCitationsContext(userId: string, projectId: number): Promise<string> {
  if (!projectId) return ''
  try {
    const supabase = makeSupabaseAdmin()
    const { data: row } = await supabase.from('project_sections')
      .select('content').eq('project_id', projectId).eq('user_id', userId).eq('section', '__citations__').single()
    if (!row?.content) return ''
    const citations: any[] = JSON.parse(row.content)
    if (!citations.length) return ''
    const list = citations.map((c, i) => `${i + 1}. ${c.text || c.formatted || ''}`).filter(s => s.trim().length > 3).join('\n')
    return list ? `\n\nThe researcher has saved the following references for this project:\n${list}` : ''
  } catch { return '' }
}

async function getUploadContext(userId: string, projectId: number): Promise<string> {
  if (!projectId) return ''
  try {
    const supabase = makeSupabaseAdmin()
    const { data: uploads } = await supabase
      .from('uploads').select('file_name, file_path')
      .eq('project_id', projectId).eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(4)

    if (!uploads?.length) return ''

    const parts: string[] = []
    for (const u of uploads) {
      try {
        const { data } = await supabase.storage.from('research-files').download(u.file_path)
        if (!data) continue
        const buf = await data.arrayBuffer()
        const { text } = await extractText(new Uint8Array(buf), { mergePages: true })
        if (text?.trim()) parts.push(`[${u.file_name}]\n${text.trim().slice(0, 3000)}`)
      } catch { /* skip */ }
    }
    return parts.join('\n\n').slice(0, 10000)
  } catch { return '' }
}

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const scholar = await isScholarServer(user.id, user.email)
  if (!scholar) return Response.json({ error: 'Scholar plan required' }, { status: 403 })

  const { allowed } = await checkRateLimit(`${user.id}:review`, 10, 60000)
  if (!allowed) return Response.json({ error: 'Rate limit exceeded. Please slow down.' }, { status: 429 })

  try {
    const { section, topic, content, projectId } = await req.json()

    if (!section || !topic || !content) return Response.json({ error: 'section, topic, and content are required' }, { status: 400 })
    if (content.trim().length < 20) {
      return Response.json({ error: 'Write a bit more before requesting mentor feedback.' }, { status: 400 })
    }
    // Truncate to prevent prompt inflation
    const safeSection  = String(section).slice(0, 100)
    const safeTopic    = String(topic).slice(0, 500)
    const safeContent  = String(content).slice(0, 8000)

    // Fetch uploaded PDFs + saved citations in parallel
    const [uploadContext, citationsContext] = await Promise.all([
      projectId ? getUploadContext(user.id, Number(projectId)) : Promise.resolve(''),
      projectId ? getCitationsContext(user.id, Number(projectId)) : Promise.resolve(''),
    ])
    const uploadBlock = uploadContext
      ? `\n\nThe researcher has uploaded the following reference documents for this project. Use them to give more specific, grounded feedback:\n\n${uploadContext}`
      : ''

    const raw = await geminiChat(
      `You are an expert academic mentor and senior medical journal editor. Your role is NOT to write for the researcher — it is to TEACH them to write better. You give honest, specific, educational feedback that helps the researcher understand what to improve and why. You ask guiding questions to make them think. You explain the standards journals expect. Always respond with valid JSON only.`,

      `You are mentoring a researcher writing the "${safeSection}" section of their medical manuscript titled "${safeTopic}".${uploadBlock}${citationsContext}

Read what they have written and give mentor-style feedback. Your feedback should:
- Teach them WHY something is wrong, not just that it is wrong
- Ask guiding questions that help them think and improve on their own
- Point out what they did well so they know what to keep
- Be specific to THEIR text, never generic
- Reference real journal/ICMJE standards where relevant

Return a JSON object with this exact structure:
{
  "score": <integer 0-100 — be honest, a first draft should score 40-65>,
  "summary": "<one encouraging but honest sentence about where they are and what they need to focus on>",
  "mentor_note": "<2-3 sentences of overall mentoring guidance — what is the single most important thing they should work on next and why>",
  "issues": [
    {
      "type": "error" | "warning" | "success",
      "title": "<short specific title>",
      "detail": "<mentoring feedback: explain the problem, WHY it matters to journals/readers, and ask a guiding question or give a specific direction — never write the text for them>",
      "question": "<optional: a guiding question to help them think about how to fix this themselves>"
    }
  ]
}

Section-specific standards to apply:
- Abstract: Must have Background, Objective, Methods, Results, Conclusion. 250 words max. Every claim needs a number.
- Introduction: Funnel structure — broad → specific → gap → your study. Must end with clear study objective.
- Methods: Reproducible — another researcher must be able to repeat this exactly. Ethics/IRB must be mentioned.
- Results: Data only, no interpretation. Every result needs a number/statistic. Tables/figures should be referenced.
- Discussion: Interpret results, compare with existing literature, acknowledge limitations, state implications.
- Conclusion: Brief, matches objectives, no new data, clear clinical/research implication.

Rules:
- Include 3-6 issues total
- At least 1 "success" to acknowledge genuine strengths
- "error" = would likely cause desk rejection
- "warning" = weakens the paper significantly
- "success" = something done well that shows good academic instinct
- NEVER suggest writing specific sentences for them
- ALWAYS frame feedback as teaching and guiding

Their text:
"""
${safeContent}
"""`
    )

    let parsed
    try {
      const clean = raw.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      return Response.json({ error: 'AI returned invalid format.' }, { status: 500 })
    }

    return Response.json(parsed)
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Mentor review failed.' }, { status: 500 })
  }
}
