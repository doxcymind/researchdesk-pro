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

  const systemPrompt = `You are an expert medical academic librarian helping a researcher gather supporting documents for their manuscript.

Given the manuscript title and study type, return categorized upload suggestions. Each suggestion must belong to one of these categories (use only what's relevant):
- Clinical History: patient history documents, clinical notes, discharge summaries
- Radiology: imaging reports, CT/MRI/X-ray/USG scans, radiological findings
- Histopathology: biopsy reports, HPE slides, pathology findings, microscopy images
- Laboratory: blood work, culture reports, biochemistry, serology, microbiology
- Operative Notes: surgical notes, intraoperative findings, procedure reports
- Clinical Images: photographs of clinical findings, wound/lesion images
- Literature: landmark journal articles, systematic reviews, guidelines, consensus statements
- Consent & Ethics: patient consent forms, IRB/ethics approval

Rules:
- Only include categories that are genuinely relevant to THIS specific study
- Be specific — say "CT abdomen report showing splenic cyst" not just "imaging report"
- For case reports: focus on clinical history, radiology, histopath, operative notes, consent
- For review articles: focus on literature, guidelines, systematic reviews
- For observational studies: focus on lab, radiology, clinical data, ethics approval
- Max 6 suggestions total

Return ONLY valid JSON, no markdown:
{
  "suggestions": [
    { "category": "<category name>", "label": "<specific document to upload, max 15 words>" },
    { "category": "<category name>", "label": "<specific document to upload, max 15 words>" }
  ]
}`

  try {
    const raw  = await geminiChat(systemPrompt, `Manuscript title: "${title}"\nStudy type: ${studyType}`)
    let data: { suggestions: { category: string; label: string }[] }
    try {
      data = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return Response.json({ suggestions: [] })
      data = JSON.parse(match[0])
    }
    const suggestions = Array.isArray(data.suggestions)
      ? data.suggestions.slice(0, 6).map(s => ({ category: String(s.category || ''), label: String(s.label || '') }))
      : []
    return Response.json({ suggestions })
  } catch (error) {
    console.error('Upload suggest error:', error)
    return Response.json({ suggestions: [] })
  }
}
