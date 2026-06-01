import { getAuthUser } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { geminiMultiTurn } from '@/lib/gemini'
import { isScholarServer } from '@/lib/check-subscription'

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const scholar = await isScholarServer(user.id, user.email)
  if (!scholar) return Response.json({ error: 'Scholar plan required' }, { status: 403 })

  const { allowed } = rateLimit(`${user.id}:chat`, 30, 60000)
  if (!allowed) return Response.json({ error: 'Rate limit exceeded. Please slow down.' }, { status: 429 })

  try {
    const { messages, projectTitle, studyType } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'No messages provided' }, { status: 400 })
    }

    // Truncate history to last 20 messages to prevent unbounded payload growth
    const recentMessages = messages.slice(-20)

    const safeTitle    = String(projectTitle || '').slice(0, 500)
    const safeType     = String(studyType || '').slice(0, 100)

    const systemPrompt = `You are ResearchDesk AI — an expert medical research assistant embedded inside a researcher's workspace.

Current project context:
- Title: "${safeTitle}"
- Study type: ${safeType}

Your role:
- Help the researcher write, structure, and improve their manuscript
- Answer medical research methodology questions
- Suggest citations, journals, and statistical approaches
- Review and rewrite text when asked
- Give specific, actionable advice — not generic tips
- Be concise but thorough. Use bullet points for lists.
- You know the full research workflow: study design → data collection → writing → peer review → submission

Always stay in the context of their specific project when relevant.`

    // Convert OpenAI-style messages to Gemini format
    // The last message must be from 'user' — we pull it out and pass as the new message
    const allMessages: { role: 'user' | 'model'; parts: { text: string }[] }[] = recentMessages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })
    )

    const lastMsg = allMessages.pop()
    if (!lastMsg || lastMsg.role !== 'user') {
      return Response.json({ error: 'Last message must be from user' }, { status: 400 })
    }

    const reply = await geminiMultiTurn(systemPrompt, allMessages, lastMsg.parts[0].text)

    return Response.json({ reply })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Chat failed' }, { status: 500 })
  }
}
