import Groq from 'groq-sdk'

function getGroq() {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY is not set')
  return new Groq({ apiKey: key })
}

/**
 * Single-turn: system prompt + user message → response text
 * Default model: llama-3.3-70b-versatile (free, very capable)
 */
export async function geminiChat(
  systemPrompt: string,
  userMessage: string,
  _model = 'llama-3.3-70b-versatile'
): Promise<string> {
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
  const groq = getGroq()

  // Convert Gemini-style history to OpenAI/Groq format
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({
      role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.parts[0]?.text || '',
    })),
    { role: 'user', content: lastUserMessage },
  ]

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
  })
  return completion.choices[0].message.content || ''
}
