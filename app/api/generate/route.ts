import { getAuthUser } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { geminiChat } from '@/lib/gemini'
import { isScholarServer } from '@/lib/check-subscription'
import { createClient } from '@supabase/supabase-js'
import { extractText } from 'unpdf'

async function getUploadContext(userId: string, projectId: number): Promise<string> {
  if (!projectId) return ''
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
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

  const { allowed } = rateLimit(`${user.id}:generate`, 20, 60000)
  if (!allowed) return Response.json({ error: 'Rate limit exceeded. Please slow down.' }, { status: 429 })

  try {
    const { section, topic, projectId } = await req.json()

    if (!section || !topic) return Response.json({ error: 'section and topic are required' }, { status: 400 })
    if (typeof section !== 'string' || typeof topic !== 'string') return Response.json({ error: 'Invalid input' }, { status: 400 })
    const safeSection = section.slice(0, 100)
    const safeTopic   = topic.slice(0, 500)

    const uploadContext = projectId ? await getUploadContext(user.id, Number(projectId)) : ''
    const uploadBlock   = uploadContext
      ? `\n\nThe researcher has uploaded the following reference documents. Use the facts, data, and citations from these documents where relevant:\n\n${uploadContext}\n\n`
      : ''

    const text = await geminiChat(
      'You are a professional medical research writing assistant. Write clearly, concisely, and in the appropriate academic style for medical journals. When reference documents are provided, incorporate their findings and cite them inline.',
      `Write a strong ${safeSection} section for a medical research manuscript titled "${safeTopic}".${uploadBlock}Use appropriate headings, structure, and academic language suitable for peer-reviewed publication.`
    )

    return Response.json({ text })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Generation failed' }, { status: 500 })
  }
}
