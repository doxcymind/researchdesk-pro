export const dynamic = 'force-dynamic'
import { geminiChat } from '@/lib/gemini'

export async function POST(req: Request) {
  const { title } = await req.json()
  if (!title?.trim()) return Response.json({ query: null })

  try {
    const prompt = `You are a medical librarian. Given this manuscript title, extract the 3-5 most important medical/clinical keywords that would yield the best PubMed search results. Return ONLY the keywords joined with spaces — no quotes, no commas, no explanation.

Title: "${title}"`

    const query = await geminiChat(prompt, '')
    return Response.json({ query: query.trim() })
  } catch {
    return Response.json({ query: null })
  }
}
