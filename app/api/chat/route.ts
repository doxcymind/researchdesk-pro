import { getAuthUser } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { geminiMultiTurn } from '@/lib/gemini'
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
    return list ? `\n\nSaved references for this project (use these when suggesting citations or reviewing):\n${list}` : ''
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

  const { allowed } = rateLimit(`${user.id}:chat`, 30, 60000)
  if (!allowed) return Response.json({ error: 'Rate limit exceeded. Please slow down.' }, { status: 429 })

  try {
    const { messages, projectTitle, studyType, projectId } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'No messages provided' }, { status: 400 })
    }

    // Truncate history to last 20 messages to prevent unbounded payload growth
    const recentMessages = messages.slice(-20)

    const safeTitle    = String(projectTitle || '').slice(0, 500)
    const safeType     = String(studyType || '').slice(0, 100)

    const [uploadContext, citationsContext] = await Promise.all([
      projectId ? getUploadContext(user.id, Number(projectId)) : Promise.resolve(''),
      projectId ? getCitationsContext(user.id, Number(projectId)) : Promise.resolve(''),
    ])
    const uploadBlock = uploadContext
      ? `\n\nReference documents uploaded by the researcher:\n${uploadContext}\n\nWhen answering, reference specific information from these documents where relevant.`
      : ''

    const systemPrompt = `You are ResearchDesk AI — an expert medical research assistant embedded inside a researcher's workspace.

Current project context:
- Title: "${safeTitle}"
- Study type: ${safeType}${uploadBlock}${citationsContext}

Your role:
- Help the researcher write, structure, and improve their manuscript
- Answer medical research methodology questions
- Suggest citations, journals, and statistical approaches
- Review and rewrite text when asked
- Give specific, actionable advice — not generic tips
- Be concise but thorough. Use bullet points for lists.
- You know the full research workflow: study design → data collection → writing → peer review → submission

Always stay in the context of their specific project when relevant.`

    // Convert OpenAI-style messages to Gemini format
    // The last message must be from 'user' — we pull it out and pass as the new message
    const allMessages: { role: 'user' | 'model'; parts: { text: string }[] }[] = recentMessages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })
    )

    const lastMsg = allMessages.pop()
    if (!lastMsg || lastMsg.role !== 'user') {
      return Response.json({ error: 'Last message must be from user' }, { status: 400 })
    }

    const reply = await geminiMultiTurn(systemPrompt, allMessages, lastMsg.parts[0].text)

    return Response.json({ reply })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Chat failed' }, { status: 500 })
  }
}
