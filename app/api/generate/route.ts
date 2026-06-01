import { getAuthUser } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { geminiChat } from '@/lib/gemini'
import { isScholarServer } from '@/lib/check-subscription'

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Server-side subscription check — cannot be bypassed from the client
  const scholar = await isScholarServer(user.id, user.email)
  if (!scholar) return Response.json({ error: 'Scholar plan required' }, { status: 403 })

  const { allowed } = rateLimit(`${user.id}:generate`, 20, 60000)
  if (!allowed) return Response.json({ error: 'Rate limit exceeded. Please slow down.' }, { status: 429 })

  try {
    const { section, topic } = await req.json()

    // Validate and truncate inputs
    if (!section || !topic) return Response.json({ error: 'section and topic are required' }, { status: 400 })
    if (typeof section !== 'string' || typeof topic !== 'string') return Response.json({ error: 'Invalid input' }, { status: 400 })
    const safeSection = section.slice(0, 100)
    const safeTopic   = topic.slice(0, 500)

    const text = await geminiChat(
      'You are a professional medical research writing assistant. Write clearly, concisely, and in the appropriate academic style for medical journals.',
      `Write a strong ${safeSection} section for a medical research manuscript titled "${safeTopic}". Use appropriate headings, structure, and academic language suitable for peer-reviewed publication.`
    )

    return Response.json({ text })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Generation failed' }, { status: 500 })
  }
}
