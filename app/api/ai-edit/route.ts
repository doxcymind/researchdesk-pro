export const dynamic = 'force-dynamic'
import { getAuthUser } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { isScholarServer } from '@/lib/check-subscription'
import { geminiChat } from '@/lib/gemini'

const ACTIONS: Record<string, string> = {
  improve: `You are an expert academic medical writer. Rewrite the following text to improve its academic tone, clarity, and precision. Use formal medical language. Keep the same meaning and length. Return ONLY the rewritten text — no explanations, no quotes.`,
  shorten: `You are an expert academic medical writer. Shorten the following text by 30–50% while preserving all key clinical information. Use concise, formal language. Return ONLY the shortened text — no explanations, no quotes.`,
  expand:  `You are an expert academic medical writer. Expand the following text by adding relevant clinical detail, context, or explanation. Stay on topic. Keep academic tone. Return ONLY the expanded text — no explanations, no quotes.`,
  journal: `You are an expert academic medical writer. Rewrite the following text in formal journal-ready style suitable for peer-reviewed medical publication. Use IMRAD conventions, passive voice where appropriate, and precise clinical terminology. Return ONLY the rewritten text — no explanations, no quotes.`,
  grammar: `You are a medical writing editor. Fix all grammar, spelling, punctuation, and sentence structure errors in the following text. Do not change the meaning or add new content. Return ONLY the corrected text — no explanations, no quotes.`,
}

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const scholar = await isScholarServer(user.id, user.email)
  if (!scholar) return Response.json({ error: 'Scholar plan required' }, { status: 403 })

  const { allowed } = rateLimit(`${user.id}:ai-edit`, 30, 60000)
  if (!allowed) return Response.json({ error: 'Rate limit exceeded.' }, { status: 429 })

  const { text, action } = await req.json()
  if (!text?.trim()) return Response.json({ error: 'No text provided' }, { status: 400 })
  if (!ACTIONS[action]) return Response.json({ error: 'Invalid action' }, { status: 400 })

  try {
    const result = await geminiChat(ACTIONS[action], text.trim())
    return Response.json({ result: result.trim() })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'AI edit failed' }, { status: 500 })
  }
}
