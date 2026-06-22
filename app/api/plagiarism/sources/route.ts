import { getAuthUser } from '@/lib/auth-helper'
import { checkRateLimit } from '@/lib/rate-limit'
import { isScholarServer } from '@/lib/check-subscription'
import { geminiChat } from '@/lib/gemini'

const MAX_TEXT_CHARS = 10000

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const scholar = await isScholarServer(user.id, user.email)
  if (!scholar) return Response.json({ error: 'Scholar plan required' }, { status: 403 })

  const { allowed } = await checkRateLimit(`${user.id}:plag-sources`, 10, 60000)
  if (!allowed) return Response.json({ error: 'Rate limit exceeded.' }, { status: 429 })

  let text: string
  try {
    const body = await req.json()
    text = String(body.text || '').trim().slice(0, MAX_TEXT_CHARS)
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!text || text.length < 50) {
    return Response.json({ error: 'Text too short' }, { status: 400 })
  }

  const systemPrompt = `You are an expert academic librarian and medical literature analyst with deep knowledge of published medical journals, textbooks, and guidelines.

Analyze the provided text and identify:
1. Any sentences or phrases that are likely taken verbatim or near-verbatim from known published sources
2. Well-known medical guidelines, consensus statements, or textbook definitions embedded in the text
3. Statistical facts or clinical data that are commonly cited from specific landmark studies

For each identified match, name the probable source publication if you know it.

Return ONLY valid JSON, no markdown:
{
  "matches": [
    {
      "phrase": "<exact text from the manuscript, max 20 words>",
      "probable_source": "<journal/book/guideline name and approximate year if known>",
      "confidence": "<high|medium|low>",
      "note": "<brief explanation>"
    }
  ],
  "overall_assessment": "<2 sentence summary of how much of the text appears to come from known sources vs original writing>",
  "estimated_similarity": <number 0-100, percentage of text likely from published sources>
}

Limit to 6 most significant matches. If no clear matches found, return an empty matches array with estimated_similarity of 0-15.`

  try {
    const raw = await geminiChat(systemPrompt, `Identify known published sources in this academic text:\n\n${text}`)

    let data: {
      matches: { phrase: string; probable_source: string; confidence: string; note: string }[]
      overall_assessment: string
      estimated_similarity: number
    }

    try {
      data = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Invalid response format')
      data = JSON.parse(match[0])
    }

    data.matches             = Array.isArray(data.matches) ? data.matches.slice(0, 6) : []
    data.estimated_similarity = Math.max(0, Math.min(100, Number(data.estimated_similarity) || 0))
    data.overall_assessment  = String(data.overall_assessment || '')

    return Response.json(data)
  } catch (error) {
    console.error('Source detection error:', error)
    return Response.json({ error: 'Source detection failed. Please try again.' }, { status: 500 })
  }
}
