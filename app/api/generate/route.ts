import { getAuthUser } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { geminiChat } from '@/lib/gemini'

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = rateLimit(`${user.id}:generate`, 20, 60000)
  if (!allowed) return Response.json({ error: 'Rate limit exceeded. Please slow down.' }, { status: 429 })

  try {
    const { section, topic } = await req.json()

    const text = await geminiChat(
      'You are a professional medical research writing assistant. Write clearly, concisely, and in the appropriate academic style for medical journals.',
      `Write a strong ${section} section for a medical research manuscript titled "${topic}". Use appropriate headings, structure, and academic language suitable for peer-reviewed publication.`
    )

    return Response.json({ text })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Generation failed' }, { status: 500 })
  }
}
