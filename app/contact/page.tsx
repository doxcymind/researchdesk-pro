'use client'
import { useState } from 'react'
import Link from 'next/link'

const cinzel = "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif"
const inter  = "var(--font-inter), 'DM Sans', system-ui, sans-serif"

const TOPICS = ['General Inquiry', 'Technical Support', 'Billing & Pricing', 'Feature Request', 'Institution Partnership', 'Privacy / Data Request', 'Other']

export default function ContactPage() {
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [topic, setTopic]   = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !topic || !message) return
    setLoading(true)
    setFormError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, topic, message }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || 'Failed to send. Try again.'); return }
      setSent(true)
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: '#080c18', minHeight: '100vh', color: '#f0e8d0', fontFamily: inter }}>
      <nav style={{ borderBottom: '1px solid rgba(201,148,58,0.15)', padding: '18px 56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,8,15,0.8)', backdropFilter: 'blur(20px)', borderTop: '2px solid rgba(201,148,58,0.5)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.webp" alt="R" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}/>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: cinzel, letterSpacing: '0.03em' }}><span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span></span>
        </Link>
        <Link href="/" style={{ fontSize: 12, color: 'rgba(201,148,58,0.6)', textDecoration: 'none', letterSpacing: '0.06em' }}>← Back to Home</Link>
      </nav>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(32px, 5vw, 72px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom: 60, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 14, fontFamily: cinzel }}>✦ &nbsp; Get in Touch</p>
          <h1 style={{ fontSize: 44, fontWeight: 600, color: '#f0e8d0', margin: '0 0 16px', fontFamily: cinzel, letterSpacing: '0.01em', lineHeight: 1.1 }}>Contact Us</h1>
          <p style={{ fontSize: 15, color: 'rgba(240,232,208,0.4)', maxWidth: 460, margin: '0 auto', lineHeight: 1.7 }}>
            We typically respond within 24 hours on business days.
          </p>
        </div>

        <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 40 }}>

          {/* Left — info cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '✉️', title: 'General',  detail: 'hello@researchdesk.app',  sub: 'General questions & feedback' },
              { icon: '🔧', title: 'Support',  detail: 'support@researchdesk.app', sub: 'Technical issues & bugs' },
              { icon: '🏛',  title: 'Institutions', detail: 'partners@researchdesk.app', sub: 'University & hospital plans' },
              { icon: '⚖',  title: 'Legal',   detail: 'legal@researchdesk.app',   sub: 'Privacy & data requests' },
            ].map(c => (
              <div key={c.title} style={{
                padding: '20px 22px', borderRadius: 16,
                background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', gap: 16,
                transition: 'border-color 0.2s, transform 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(201,148,58,0.2)'; (e.currentTarget as HTMLElement).style.transform='translateX(4px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.transform='' }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(201,148,58,0.08)', border: '1px solid rgba(201,148,58,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{c.icon}</div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(240,232,208,0.5)', margin: '0 0 3px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{c.title}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#c9943a', margin: '0 0 2px' }}>{c.detail}</p>
                  <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)', margin: 0 }}>{c.sub}</p>
                </div>
              </div>
            ))}

            <div style={{ padding: '20px 22px', borderRadius: 16, background: 'rgba(201,148,58,0.05)', border: '1px solid rgba(201,148,58,0.15)', marginTop: 4 }}>
              <p style={{ fontSize: 12, color: 'rgba(201,148,58,0.6)', margin: '0 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>Response Time</p>
              <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.5)', margin: 0, lineHeight: 1.6 }}>
                General & Support: <strong style={{ color: '#f0e8d0' }}>within 24 hrs</strong><br/>
                Institutions: <strong style={{ color: '#f0e8d0' }}>within 48 hrs</strong><br/>
                Mon–Fri, 9am–6pm IST
              </p>
            </div>
          </div>

          {/* Right — form */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,148,58,0.15)', borderRadius: 22, padding: '36px 36px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(201,148,58,0.5), transparent)' }}/>

            {sent ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 20 }}>✦</div>
                <h2 style={{ fontSize: 26, fontWeight: 600, color: '#f0e8d0', margin: '0 0 12px', fontFamily: cinzel }}>Message Sent</h2>
                <p style={{ fontSize: 14, color: 'rgba(240,232,208,0.45)', lineHeight: 1.7, maxWidth: 340, margin: '0 auto 28px' }}>
                  Thank you for reaching out. We'll get back to you at <strong style={{ color: '#c9943a' }}>{email}</strong> within 24 hours.
                </p>
                <button type="button" onClick={() => { setSent(false); setName(''); setEmail(''); setTopic(''); setMessage('') }}
                  style={{ padding: '11px 28px', borderRadius: 10, background: 'rgba(201,148,58,0.1)', border: '1px solid rgba(201,148,58,0.3)', color: '#c9943a', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: inter }}>
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { label: 'Your Name', value: name, set: setName, placeholder: 'Dr. Sparsh Dixit', type: 'text' },
                    { label: 'Email Address', value: email, set: setEmail, placeholder: 'you@hospital.com', type: 'email' },
                  ].map(f => (
                    <div key={f.label}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{f.label}</label>
                      <input type={f.type} value={f.value} placeholder={f.placeholder}
                        onChange={e => f.set(e.target.value)}
                        style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#f0e8d0', outline: 'none', fontFamily: inter, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                        onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Topic</label>
                  <select value={topic} onChange={e => setTopic(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: topic ? '#f0e8d0' : 'rgba(240,232,208,0.3)', outline: 'none', fontFamily: inter, cursor: 'pointer', transition: 'border-color 0.2s' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,148,58,0.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  >
                    <option value="" disabled style={{ background: '#080c18' }}>Select a topic…</option>
                    {TOPICS.map(t => <option key={t} value={t} style={{ background: '#0d1426' }}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(201,148,58,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Tell us how we can help you…"
                    rows={5}
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#f0e8d0', outline: 'none', fontFamily: inter, resize: 'vertical', boxSizing: 'border-box', transition: 'border-color 0.2s', lineHeight: 1.6 }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(201,148,58,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                  <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.25)', margin: '6px 0 0', textAlign: 'right' }}>{message.length} characters</p>
                </div>

                {formError && (
                  <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontSize: 13 }}>
                    {formError}
                  </div>
                )}

                <button type="submit" disabled={loading || !name || !email || !topic || !message}
                  style={{
                    padding: '15px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: (!name || !email || !topic || !message) ? 'not-allowed' : 'pointer',
                    backgroundImage: (!name || !email || !topic || !message) ? 'none' : 'linear-gradient(135deg, #c9943a, #e8b84a)',
                    backgroundColor: (!name || !email || !topic || !message) ? 'rgba(255,255,255,0.05)' : 'transparent',
                    color: (!name || !email || !topic || !message) ? 'rgba(240,232,208,0.2)' : '#080c18',
                    transition: 'all 0.2s', fontFamily: inter,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                  onMouseEnter={e => { if (name && email && topic && message && !loading) { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 8px 30px rgba(201,148,58,0.35)' } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow='' }}
                >
                  {loading ? (
                    <><span style={{ width: 16, height: 16, border: '2px solid rgba(8,12,24,0.3)', borderTopColor: '#080c18', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/> Sending…</>
                  ) : '✦ Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer style={{ borderTop: '1px solid rgba(201,148,58,0.1)', padding: '24px 56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#4a3820', marginTop: 40 }}>
        <span style={{ fontFamily: cinzel }}>© 2026 ResearchDesk. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {[{ label: 'Privacy Policy', href: '/privacy' }, { label: 'Terms of Service', href: '/terms' }, { label: 'Contact', href: '/contact' }].map(l => (
            <Link key={l.label} href={l.href} style={{ color: '#4a3820', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#c9943a')} onMouseLeave={e => (e.currentTarget.style.color = '#4a3820')}>{l.label}</Link>
          ))}
        </div>
      </footer>

      <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
