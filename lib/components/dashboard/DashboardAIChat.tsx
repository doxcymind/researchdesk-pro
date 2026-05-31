'use client'

import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'

interface Message {
  role: 'assistant' | 'user'
  content: string
}

interface Props {
  displayName: string
  projects: { title: string; study_type: string }[]
}

export default function DashboardAIChat({ displayName, projects }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [typedText, setTypedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const inter = "var(--font-inter),'DM Sans',system-ui,sans-serif"
  const cinzel = "var(--font-cinzel),'Cormorant Garamond',Georgia,serif"

  const hour = new Date().getHours()
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    if (!displayName) return
    const projectLine = projects.length === 0
      ? "I see you haven't created any projects yet — I can help you get started."
      : projects.length === 1
        ? `I can see you're working on **${projects[0].title}** (${projects[0].study_type}).`
        : `I can see you have **${projects.length} active projects**, including **${projects[0].title}**.`

    const fullText = `${timeGreeting}, **${displayName}**! 👋  I'm your ResearchDesk AI assistant. ${projectLine}\n\nWhat would you like to work on today?`

    setMessages([{ role: 'assistant', content: fullText }])

    // Typewriter effect
    setTypedText('')
    setIsTyping(true)
    let i = 0
    const interval = setInterval(() => {
      i++
      setTypedText(fullText.slice(0, i))
      if (i >= fullText.length) {
        clearInterval(interval)
        setIsTyping(false)
      }
    }, 18)
    return () => clearInterval(interval)
  }, [displayName])

  useEffect(() => {
    if (expanded) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, expanded])

  useEffect(() => {
    if (expanded) setTimeout(() => inputRef.current?.focus(), 100)
  }, [expanded])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          projectTitle: projects[0]?.title || 'General Research',
          studyType: projects[0]?.study_type || 'Research',
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply || data.error || 'Something went wrong.',
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }])
    }
    setLoading(false)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const renderText = (text: string) => {
    return text.split('\n').map((line, i, arr) => {
      const parts = line.split(/\*\*(.*?)\*\*/g)
      const rendered = parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: '#f0e8d0' }}>{p}</strong> : p)
      return <span key={i}>{rendered}{i < arr.length - 1 && <br />}</span>
    })
  }


  return (
    <div style={{
      marginBottom: 32,
      borderRadius: 20,
      border: '1px solid rgba(201,148,58,0.25)',
      background: 'linear-gradient(135deg, rgba(201,148,58,0.07) 0%, rgba(5,8,15,0.9) 60%)',
      overflow: 'hidden',
      position: 'relative',
      boxShadow: '0 4px 40px rgba(201,148,58,0.06)',
    }}>

      {/* Gold top accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #c9943a, transparent)' }} />

      {/* Header row — always visible */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px',
        cursor: 'pointer',
      }} onClick={() => setExpanded(e => !e)}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* AI avatar */}
          <div style={{
            width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(201,148,58,0.2), rgba(201,148,58,0.06))',
            border: '1px solid rgba(201,148,58,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: '#c9943a',
            boxShadow: '0 0 18px rgba(201,148,58,0.2)',
            animation: 'aiGlow 3s ease-in-out infinite',
          }}>✦</div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f0e8d0', fontFamily: cinzel, letterSpacing: '0.02em' }}>
                ResearchDesk AI
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(52,211,153,0.8)', fontWeight: 600 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
                Online · Your AI Research Assistant
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {messages.length > 1 && (
            <span style={{ fontSize: 10, color: 'rgba(201,148,58,0.5)', background: 'rgba(201,148,58,0.1)', border: '1px solid rgba(201,148,58,0.2)', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>
              {messages.length - 1} message{messages.length > 2 ? 's' : ''}
            </span>
          )}
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: 'rgba(240,232,208,0.4)',
            transition: 'transform 0.25s',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>▾</div>
        </div>
      </div>

      {/* Expanded chat area */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Messages */}
          <div style={{
            maxHeight: 320, overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: 10,
                animation: 'msgIn 0.2s ease',
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(201,148,58,0.1)', border: '1px solid rgba(201,148,58,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#c9943a', marginTop: 2,
                  }}>✦</div>
                )}
                <div style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                  background: msg.role === 'user'
                    ? 'rgba(201,148,58,0.12)'
                    : 'rgba(255,255,255,0.04)',
                  border: msg.role === 'user'
                    ? '1px solid rgba(201,148,58,0.2)'
                    : '1px solid rgba(255,255,255,0.07)',
                  fontSize: 13, color: 'rgba(240,232,208,0.85)', lineHeight: 1.65,
                  fontFamily: inter,
                }}>
                  {renderText(i === 0 && isTyping ? typedText : msg.content)}
                  {i === 0 && isTyping && (
                    <span style={{ display: 'inline-block', width: 2, height: '1em', background: '#c9943a', marginLeft: 2, verticalAlign: 'middle', animation: 'cursorBlink 0.7s step-end infinite', borderRadius: 1 }} />
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(201,148,58,0.1)', border: '1px solid rgba(201,148,58,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#c9943a' }}>✦</div>
                <div style={{ display: 'flex', gap: 5, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px 16px 16px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {[0, 1, 2].map(d => (
                    <span key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(201,148,58,0.6)', display: 'inline-block', animation: `dotBounce 1.2s ${d * 0.2}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div style={{
            padding: '12px 16px 16px',
            display: 'flex', gap: 10, alignItems: 'flex-end',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(0,0,0,0.15)',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything — manuscript help, citations, journal matching…"
              rows={1}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 12, padding: '10px 14px',
                fontSize: 13, color: '#f0e8d0',
                outline: 'none', resize: 'none',
                fontFamily: inter, lineHeight: 1.5,
                maxHeight: 100, overflowY: 'auto',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                height: 40, width: 40, borderRadius: 12, flexShrink: 0,
                background: input.trim() && !loading
                  ? 'linear-gradient(135deg, #c9943a, #e8b84a)'
                  : 'rgba(255,255,255,0.05)',
                border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                color: input.trim() && !loading ? '#080c18' : 'rgba(255,255,255,0.2)',
                fontSize: 16, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >↑</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes aiGlow {
          0%, 100% { box-shadow: 0 0 12px rgba(201,148,58,0.15); }
          50%       { box-shadow: 0 0 24px rgba(201,148,58,0.35); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
        }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotBounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50%       { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; } 50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
