import { getAuthUser } from '@/lib/auth-helper'
import { geminiChat } from '@/lib/gemini'

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let title: string, studyType: string
  try {
    const body = await req.json()
    title     = String(body.title     || '').trim()
    studyType = String(body.studyType || 'manuscript').trim()
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!title) return Response.json({ suggestions: [] })

  const systemPrompt = `You are an expert academic research librarian helping a medical researcher gather reference material.

Given the manuscript title and study type, suggest exactly 5 specific types of PDFs the researcher should upload as reference material.
Be specific and practical — name real types of documents, guidelines, or studies they should find.

Return ONLY valid JSON, no markdown:
{
  "suggestions": [
    "<specific document type to upload — one sentence, max 20 words>",
    "<specific document type to upload — one sentence, max 20 words>",
    "<specific document type to upload — one sentence, max 20 words>",
    "<specific document type to upload — one sentence, max 20 words>",
    "<specific document type to upload — one sentence, max 20 words>"
  ]
}`

  try {
    const raw  = await geminiChat(systemPrompt, `Manuscript title: "${title}"\nStudy type: ${studyType}`)
    let data: { suggestions: string[] }
    try {
      data = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return Response.json({ suggestions: [] })
      data = JSON.parse(match[0])
    }
    const suggestions = Array.isArray(data.suggestions)
      ? data.suggestions.slice(0, 5).map(s => String(s))
      : []
    return Response.json({ suggestions })
  } catch (error) {
    console.error('Upload suggest error:', error)
    return Response.json({ suggestions: [] })
  }
}
