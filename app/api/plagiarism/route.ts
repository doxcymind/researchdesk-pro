import { getAuthUser } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { isScholarServer } from '@/lib/check-subscription'
import OpenAI from 'openai'

const MAX_TEXT_CHARS = 12000

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not configured')
  return new OpenAI({ apiKey: key })
}

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const scholar = await isScholarServer(user.id, user.email)
  if (!scholar) return Response.json({ error: 'Scholar plan required' }, { status: 403 })

  const { allowed } = rateLimit(`${user.id}:plagiarism`, 10, 60000)
  if (!allowed) return Response.json({ error: 'Rate limit exceeded. Please wait a minute.' }, { status: 429 })

  let text: string
  try {
    const body = await req.json()
    text = String(body.text || '').trim()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!text) return Response.json({ error: 'No text provided' }, { status: 400 })
  if (text.length < 50) return Response.json({ error: 'Text too short for analysis (minimum 50 characters)' }, { status: 400 })

  const truncated = text.slice(0, MAX_TEXT_CHARS)

  try {
    const openai = getOpenAI()

    const systemPrompt = `You are an expert academic plagiarism and originality analyst for medical research manuscripts.

Analyze the provided text for:
1. Originality and uniqueness of expression
2. Phrases that appear to be verbatim or near-verbatim from common medical literature
3. Paraphrased content that may be too close to source material
4. Generic boilerplate text common in many papers
5. Areas of strong original contribution

Return ONLY valid JSON in this exact structure (no markdown, no extra text):
{
  "originality_score": <number 0-100>,
  "risk_level": "<low|medium|high>",
  "summary": "<2-3 sentence overall assessment>",
  "flagged_phrases": [
    {
      "text": "<exact phrase from the text, max 15 words>",
      "reason": "<why this is flagged>",
      "severity": "<low|medium|high>"
    }
  ],
  "strengths": ["<strength 1>", "<strength 2>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}

Limit flagged_phrases to at most 8. Be precise and constructive.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this academic text for plagiarism/originality:\n\n${truncated}` },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    })

    const raw = completion.choices[0].message.content || ''

    let analysis: {
      originality_score: number
      risk_level: string
      summary: string
      flagged_phrases: { text: string; reason: string; severity: string }[]
      strengths: string[]
      recommendations: string[]
    }

    try {
      analysis = JSON.parse(raw)
    } catch {
      // Try extracting JSON from the response
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('AI returned invalid response format')
      analysis = JSON.parse(match[0])
    }

    // Validate and clamp
    analysis.originality_score = Math.max(0, Math.min(100, Number(analysis.originality_score) || 70))
    analysis.risk_level = ['low', 'medium', 'high'].includes(analysis.risk_level) ? analysis.risk_level : 'medium'
    analysis.flagged_phrases = Array.isArray(analysis.flagged_phrases) ? analysis.flagged_phrases.slice(0, 8) : []
    analysis.strengths = Array.isArray(analysis.strengths) ? analysis.strengths.slice(0, 5) : []
    analysis.recommendations = Array.isArray(analysis.recommendations) ? analysis.recommendations.slice(0, 5) : []

    return Response.json({ analysis, truncated: text.length > MAX_TEXT_CHARS })
  } catch (error) {
    console.error('Plagiarism AI analysis error:', error)
    return Response.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }
}
