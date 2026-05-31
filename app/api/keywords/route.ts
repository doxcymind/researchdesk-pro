import { getAuthUser } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { geminiChat } from '@/lib/gemini'

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = rateLimit(`${user.id}:keywords`, 15, 60000)
  if (!allowed) return Response.json({ error: 'Rate limit exceeded.' }, { status: 429 })

  try {
    const { abstract } = await req.json()
    if (!abstract?.trim()) return Response.json({ error: 'Abstract required' }, { status: 400 })

    const raw = await geminiChat(
      `You are a medical librarian expert in MeSH (Medical Subject Headings) terminology.
Analyze the given abstract and suggest the most relevant keywords for journal submission.

Rules:
- Suggest exactly 8-10 keywords
- Prefer official MeSH terms where applicable
- Include the primary condition/disease, study design, intervention (if any), outcome measures, and population
- Order by relevance (most important first)
- Use Title Case
- Return ONLY a JSON array of strings, nothing else

Example output: ["Diabetes Mellitus, Type 2", "Cardiovascular Diseases", "Randomized Controlled Trial", "Insulin Resistance", "HbA1c", "Adult", "Retrospective Studies", "Mortality"]`,
      `Suggest MeSH-aligned keywords for this abstract:\n\n${abstract}`
    )

    let keywords: string[] = []
    try {
      keywords = JSON.parse(raw.replace(/```json|```/g, '').trim())
    } catch {
      keywords = raw.replace(/[\[\]"]/g, '').split(/[,\n]/).map(k => k.trim()).filter(Boolean)
    }

    return Response.json({ keywords: keywords.slice(0, 10) })
  } catch (e) {
    console.error(e)
    return Response.json({ error: 'Keyword generation failed' }, { status: 500 })
  }
}
