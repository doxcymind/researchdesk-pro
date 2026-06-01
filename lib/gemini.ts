import Groq from 'groq-sdk'

function getGroq() {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY is not set')
  return new Groq({ apiKey: key })
}

/** Fallback: OpenAI-compatible call when GROQ_API_KEY is absent */
async function openAIChat(systemPrompt: string, userMessage: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('Neither GROQ_API_KEY nor OPENAI_API_KEY is set')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content || ''
}

/**
 * Single-turn: system prompt + user message → response text
 * Uses Groq (llama-3.3-70b) if GROQ_API_KEY is set, falls back to OpenAI gpt-4o-mini
 */
export async function geminiChat(
  systemPrompt: string,
  userMessage: string,
  _model = 'llama-3.3-70b-versatile'
): Promise<string> {
  if (!process.env.GROQ_API_KEY) return openAIChat(systemPrompt, userMessage)
  const groq = getGroq()
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })
  return completion.choices[0].message.content || ''
}

/**
 * Multi-turn chat for the AI assistant.
 * history: [{role:'user'|'model', parts:[{text}]}]
 */
export async function geminiMultiTurn(
  systemPrompt: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  lastUserMessage: string,
  _model = 'llama-3.3-70b-versatile'
): Promise<string> {
  const msgs = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map(m => ({
      role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.parts[0]?.text || '',
    })),
    { role: 'user' as const, content: lastUserMessage },
  ]

  if (!process.env.GROQ_API_KEY) {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new Error('Neither GROQ_API_KEY nor OPENAI_API_KEY is set')
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: msgs }),
    })
    if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`)
    const data = await res.json()
    return data.choices[0].message.content || ''
  }

  const groq = getGroq()
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: msgs as Groq.Chat.ChatCompletionMessageParam[],
  })
  return completion.choices[0].message.content || ''
}
