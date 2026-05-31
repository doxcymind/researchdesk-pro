import { getAuthUser } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { geminiChat } from '@/lib/gemini'

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = rateLimit(`${user.id}:${req.url.split('/api/')[1]}`, 5, 60000)
  if (!allowed) return Response.json({ error: 'Rate limit exceeded. Please slow down.' }, { status: 429 })

  try {
    const { journal, studyType } = await req.json()

    if (!journal?.trim()) return Response.json({ error: 'Journal name required' }, { status: 400 })

    const raw = await geminiChat(
      `You are a medical journal submission expert with encyclopedic knowledge of author guidelines for all major medical journals. You generate precise, actionable submission checklists.

Always respond with valid JSON only — no markdown fences, no commentary outside the JSON.`,
      `Generate a detailed submission checklist for the journal "${journal}" for a "${studyType || 'research article'}".

Use your knowledge of this journal's official author guidelines. If you know specific requirements (word limits, reference style, figure formats, etc.), use them. If unsure of exact numbers, give realistic estimates based on the journal tier.

Return this exact JSON structure:
{
  "journal": "<full official journal name>",
  "publisher": "<publisher name>",
  "referenceStyle": "<e.g. Vancouver, AMA, APA>",
  "wordLimit": "<e.g. 3500 words excluding references>",
  "abstractLimit": "<e.g. 250 words, structured>",
  "categories": [
    {
      "name": "<category name>",
      "icon": "<single emoji>",
      "items": [
        {
          "id": "<unique snake_case id>",
          "text": "<specific, actionable checklist item>",
          "detail": "<optional: one short sentence with specifics like word count, format, etc. or null>",
          "required": <true|false>
        }
      ]
    }
  ]
}

Categories must include (in this order, but tailor content to the journal):
1. Manuscript Format (title page, word count, structure, line numbers, font)
2. Abstract & Keywords (format, word limit, keyword count/source)
3. Introduction & Background
4. Methods (ethics, consent, trial registration, statistics)
5. Results & Data
6. Discussion & Conclusions
7. References (style, format, limit if any)
8. Figures & Tables (resolution, format, legends, limits)
9. Ethics & Declarations (conflicts of interest, funding, author contributions, data availability)
10. Cover Letter & Submission (what to include, where to submit, fees)

Each category should have 3-6 items. Make items specific to "${journal}" wherever possible (word limits, styles, portals, etc.).
Mark as required=true only items that are mandatory for submission.`
    )
    let parsed
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    } catch {
      return Response.json({ error: 'Failed to parse checklist' }, { status: 500 })
    }

    return Response.json(parsed)
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Checklist generation failed' }, { status: 500 })
  }
}
