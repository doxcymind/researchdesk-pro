'use client'
import { apiFetch } from '@/lib/api-fetch'

import { useEffect, useRef, useState } from 'react'

interface Props {
  projectTitle: string
  studyType: string
  projectId: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'How should I structure my Methods section?',
  'What statistical test should I use for my data?',
  'Suggest 5 journals for this study type',
  'How do I write a strong Discussion?',
  'What goes in the Abstract for a case report?',
  'How do I handle ethical approval in Methods?',
]

function MarkdownText({ text }: { text: string }) {
  // Simple inline rendering: bold, bullet points, numbered lists
  const lines = text.split('\n')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />
        // Bullet
        if (line.match(/^[-•*]\s/)) {
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ color: '#c9943a', fontSize: 12, marginTop: 2, flexShrink: 0 }}>▸</span>
              <span>{renderInline(line.replace(/^[-•*]\s/, ''))}</span>
            </div>
          )
        }
        // Numbered list
        if (line.match(/^\d+\.\s/)) {
          const [num, ...rest] = line.split(/\.\s(.+)/)
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ color: '#c9943a', fontSize: 11, fontWeight: 700, marginTop: 1, flexShrink: 0, minWidth: 16 }}>{num}.</span>
              <span>{renderInline(rest.join('. '))}</span>
            </div>
          )
        }
        // Heading (##)
        if (line.startsWith('## ')) return <div key={i} style={{ fontSize: 13, fontWeight: 700, color: '#e8c878', marginTop: 6 }}>{line.replace('## ', '')}</div>
        if (line.startsWith('# '))  return <div key={i} style={{ fontSize: 14, fontWeight: 700, color: '#e8c878', marginTop: 8 }}>{line.replace('# ', '')}</div>
        return <div key={i}>{renderInline(line)}</div>
      })}
    </div>
  )
}

function renderInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ color: '#f0e8d0', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  )
}

export default function AIAssistantPanel({ projectTitle, studyType, projectId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text?: string) => {
    const userText = (text || input).trim()
    if (!userText || loading) return

    const userMsg: Message = { role: 'user', content: userText }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated,
          projectTitle,
          studyType,
        }),
      })
      const data = await res.json()
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 580, gap: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#f0e8d0', letterSpacing: '-0.4px', margin: '0 0 3px' }}>AI Assistant</h2>
          <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0 }}>
            Aware of your project: <span style={{ color: 'rgba(201,148,58,0.6)' }}>{projectTitle}</span> · {studyType}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,232,208,0.3)')}
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 4, marginBottom: 16 }}>

        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Welcome */}
            <div style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(201,148,58,0.06)', border: '1px solid rgba(201,148,58,0.15)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(201,148,58,0.3), rgba(201,148,58,0.1))', border: '1px solid rgba(201,148,58,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>✦</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#e8c878', margin: '0 0 6px' }}>ResearchDesk AI</p>
                  <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.6)', margin: 0, lineHeight: 1.6 }}>
                    Hi! I'm your research assistant for <strong style={{ color: '#f0e8d0' }}>{projectTitle}</strong>. I know your project is a <strong style={{ color: '#f0e8d0' }}>{studyType}</strong> and I can help with writing, methodology, citations, journal selection, and anything else you need.
                  </p>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,232,208,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 10px' }}>Suggested questions</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      textAlign: 'left', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                      color: 'rgba(240,232,208,0.55)', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,148,58,0.25)'; e.currentTarget.style.color = '#f0e8d0' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(240,232,208,0.55)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            {/* Avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #c9943a, #8b6914)'
                : 'linear-gradient(135deg, rgba(201,148,58,0.3), rgba(201,148,58,0.1))',
              border: msg.role === 'assistant' ? '1px solid rgba(201,148,58,0.3)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: msg.role === 'user' ? 11 : 13, fontWeight: 700,
              color: msg.role === 'user' ? '#080c18' : '#c9943a',
            }}>
              {msg.role === 'user' ? 'You' : '✦'}
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth: '78%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
              background: msg.role === 'user' ? 'rgba(201,148,58,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(201,148,58,0.25)' : 'rgba(255,255,255,0.07)'}`,
              fontSize: 13, color: 'rgba(240,232,208,0.85)', lineHeight: 1.65,
            }}>
              {msg.role === 'assistant' ? <MarkdownText text={msg.content} /> : msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(201,148,58,0.3), rgba(201,148,58,0.1))', border: '1px solid rgba(201,148,58,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#c9943a', flexShrink: 0 }}>✦</div>
            <div style={{ padding: '14px 18px', borderRadius: '4px 14px 14px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(d => (
                <div key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: '#c9943a', animation: `typingDot 1.2s ${d * 0.2}s ease-in-out infinite` }}/>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 10, alignItems: 'flex-end', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything about your research… (Enter to send, Shift+Enter for new line)"
          rows={1}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none', resize: 'none',
            fontSize: 13, color: '#f0e8d0', lineHeight: 1.6, fontFamily: 'inherit',
            maxHeight: 120, overflowY: 'auto',
          }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: !input.trim() || loading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #c9943a, #e8b84a)',
            border: 'none', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, color: !input.trim() || loading ? 'rgba(240,232,208,0.2)' : '#080c18',
            transition: 'all 0.2s',
          }}
        >↑</button>
      </div>

      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
