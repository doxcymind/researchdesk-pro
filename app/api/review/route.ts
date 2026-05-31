import { getAuthUser } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { geminiChat } from '@/lib/gemini'

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = rateLimit(`${user.id}:review`, 10, 60000)
  if (!allowed) return Response.json({ error: 'Rate limit exceeded. Please slow down.' }, { status: 429 })

  try {
    const { section, topic, content } = await req.json()

    if (!content || content.trim().length < 20) {
      return Response.json({ error: 'Not enough text to review.' }, { status: 400 })
    }

    const raw = await geminiChat(
      `You are a senior medical journal editor and peer reviewer. You review manuscript sections and return structured, honest feedback. Always respond with valid JSON only — no markdown, no explanation outside the JSON.`,
      `Review the following "${section}" section from a medical manuscript titled "${topic}".

Return a JSON object with this exact structure:
{
  "score": <integer 0-100>,
  "summary": "<one sentence overall assessment>",
  "issues": [
    {
      "type": "error" | "warning" | "success",
      "title": "<short issue title>",
      "detail": "<specific, actionable feedback in 1-2 sentences>"
    }
  ]
}

Rules:
- "error" = critical problems that would likely cause rejection
- "warning" = areas needing improvement
- "success" = genuine strengths worth keeping
- Include 2-5 issues total, mix of types
- Be specific to the actual text, not generic
- Score should reflect real quality (don't inflate)

Section text:
"""
${content}
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
    return Response.json({ error: 'Review failed.' }, { status: 500 })
  }
}
