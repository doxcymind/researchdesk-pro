'use client'

import Link from 'next/link'
import { blogPosts } from '@/lib/blog/posts'

const cinzel = "var(--font-cinzel),'Cormorant Garamond',Georgia,serif"
const inter  = "var(--font-inter),'DM Sans',system-ui,sans-serif"

export default function BlogIndex() {
  return (
    <div style={{ background: '#080c18', minHeight: '100vh', color: '#f0e8d0', fontFamily: inter }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(201,148,58,0.15)', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,8,15,0.9)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 40, borderTop: '2px solid rgba(201,148,58,0.4)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.webp" alt="R" style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'cover' }} />
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: cinzel }}><span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span></span>
        </Link>
        <Link href="/login" style={{ fontSize: 12, color: '#c9943a', textDecoration: 'none', padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(201,148,58,0.3)', background: 'rgba(201,148,58,0.08)' }}>Start Writing →</Link>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(16px,4vw,32px)' }}>
        <div style={{ marginBottom: 48 }}>
          <span style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: cinzel }}>✦ ResearchDesk Blog</span>
          <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 700, color: '#f0e8d0', margin: '10px 0 14px', fontFamily: cinzel, lineHeight: 1.1 }}>Medical Research Writing Guides</h1>
          <p style={{ fontSize: 16, color: 'rgba(240,232,208,0.55)', lineHeight: 1.7, maxWidth: 560 }}>Practical guides for clinicians and researchers — from writing your first case report to submitting to the world's top journals.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {blogPosts.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
              <article style={{ padding: '24px 28px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', transition: 'border-color 0.2s, background 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(201,148,58,0.25)'; (e.currentTarget as HTMLElement).style.background='rgba(201,148,58,0.04)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(201,148,58,0.1)', color: '#c9943a', border: '1px solid rgba(201,148,58,0.2)', fontWeight: 600 }}>{post.category}</span>
                  <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)' }}>{post.date} · {post.readTime}</span>
                </div>
                <h2 style={{ fontSize: 'clamp(16px,2.5vw,20px)', fontWeight: 600, color: '#f0e8d0', margin: '0 0 8px', fontFamily: cinzel, lineHeight: 1.3 }}>{post.title}</h2>
                <p style={{ fontSize: 14, color: 'rgba(240,232,208,0.5)', lineHeight: 1.65, margin: 0 }}>{post.description}</p>
                <span style={{ display: 'inline-block', marginTop: 14, fontSize: 12, color: '#c9943a', fontWeight: 600 }}>Read article →</span>
              </article>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 48, padding: '24px 28px', borderRadius: 16, background: 'rgba(201,148,58,0.05)', border: '1px solid rgba(201,148,58,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#f0e8d0', margin: '0 0 4px' }}>Ready to write your manuscript?</p>
            <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0 }}>AI-assisted writing, peer review simulation, citation tools & more</p>
          </div>
          <Link href="/login" style={{ textDecoration: 'none', padding: '11px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #c9943a, #e8b84a)', color: '#080c18', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
            Get Started Free →
          </Link>
        </div>
      </div>
    </div>
  )
}
