import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { blogPosts, getBlogPost } from '@/lib/blog/posts'

export async function generateStaticParams() {
  return blogPosts.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    openGraph: { title: post.title, description: post.description, type: 'article' },
  }
}

const cinzel = "var(--font-cinzel),'Cormorant Garamond',Georgia,serif"
const inter  = "var(--font-inter),'DM Sans',system-ui,sans-serif"

function renderContent(content: string) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} style={{ fontSize: 'clamp(18px,2.5vw,24px)', fontWeight: 600, color: '#f0e8d0', margin: '36px 0 14px', fontFamily: cinzel, lineHeight: 1.3, paddingBottom: 8, borderBottom: '1px solid rgba(201,148,58,0.15)' }}>{line.replace('## ', '')}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} style={{ fontSize: 'clamp(15px,2vw,18px)', fontWeight: 600, color: '#e8c878', margin: '24px 0 10px', lineHeight: 1.4 }}>{line.replace('### ', '')}</h3>)
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '32px 0' }} />)
    } else if (line.startsWith('| ')) {
      // Table
      const tableLines: string[] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const headers = tableLines[0].split('|').filter(Boolean).map(h => h.trim())
      const rows = tableLines.slice(2).map(r => r.split('|').filter(Boolean).map(c => c.trim()))
      elements.push(
        <div key={`table-${i}`} style={{ overflowX: 'auto', margin: '20px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{headers.map((h, j) => <th key={j} style={{ padding: '8px 14px', textAlign: 'left', borderBottom: '1px solid rgba(201,148,58,0.2)', color: '#c9943a', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, j) => <tr key={j} style={{ background: j % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>{row.map((cell, k) => <td key={k} style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(240,232,208,0.7)', fontSize: 13 }}>{cell}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      )
      continue
    } else if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
      // Checklist
      const items: string[] = []
      while (i < lines.length && (lines[i].startsWith('- [ ] ') || lines[i].startsWith('- [x] '))) {
        items.push(lines[i])
        i++
      }
      elements.push(
        <ul key={`cl-${i}`} style={{ listStyle: 'none', padding: 0, margin: '16px 0' }}>
          {items.map((item, j) => (
            <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', color: 'rgba(240,232,208,0.7)', fontSize: 14 }}>
              <span style={{ marginTop: 2, fontSize: 16, color: item.startsWith('- [x]') ? '#34d399' : 'rgba(201,148,58,0.4)' }}>{item.startsWith('- [x]') ? '☑' : '☐'}</span>
              <span>{item.replace(/^- \[.\] /, '')}</span>
            </li>
          ))}
        </ul>
      )
      continue
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i])
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} style={{ paddingLeft: 20, margin: '12px 0' }}>
          {items.map((item, j) => <li key={j} style={{ color: 'rgba(240,232,208,0.7)', fontSize: 15, lineHeight: 1.7, marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: formatInline(item.replace(/^[-*] /, '')) }} />)}
        </ul>
      )
      continue
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i])
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} style={{ paddingLeft: 22, margin: '12px 0' }}>
          {items.map((item, j) => <li key={j} style={{ color: 'rgba(240,232,208,0.7)', fontSize: 15, lineHeight: 1.7, marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: formatInline(item.replace(/^\d+\. /, '')) }} />)}
        </ol>
      )
      continue
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} style={{ borderLeft: '3px solid rgba(201,148,58,0.4)', paddingLeft: 16, margin: '16px 0', color: 'rgba(240,232,208,0.6)', fontStyle: 'italic', fontSize: 14 }}>
          {line.replace('> ', '')}
        </blockquote>
      )
    } else if (line.startsWith('`') && !line.startsWith('```')) {
      elements.push(<p key={i} style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 8, fontSize: 13, color: '#e8c878', margin: '12px 0', overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: line }} />)
    } else if (line.trim() === '') {
      // skip empty lines
    } else {
      elements.push(<p key={i} style={{ fontSize: 15, lineHeight: 1.85, color: 'rgba(240,232,208,0.72)', margin: '10px 0' }} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />)
    }
    i++
  }
  return elements
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f0e8d0">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.07);padding:2px 6px;border-radius:4px;font-size:13px;color:#e8c878">$1</code>')
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  return (
    <div style={{ background: '#080c18', minHeight: '100vh', color: '#f0e8d0', fontFamily: inter }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(201,148,58,0.15)', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,8,15,0.9)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 40, borderTop: '2px solid rgba(201,148,58,0.4)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.webp" alt="R" style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'cover' }} />
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: cinzel }}><span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span></span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/blog" style={{ fontSize: 13, color: 'rgba(240,232,208,0.5)', textDecoration: 'none' }}>← Blog</Link>
          <Link href="/login" style={{ fontSize: 12, color: '#c9943a', textDecoration: 'none', padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(201,148,58,0.3)', background: 'rgba(201,148,58,0.08)' }}>Start Writing →</Link>
        </div>
      </nav>

      <article style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(32px,5vw,60px) clamp(16px,4vw,32px)' }}>
        {/* Header */}
        <header style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(201,148,58,0.1)', color: '#c9943a', border: '1px solid rgba(201,148,58,0.2)', fontWeight: 600 }}>{post.category}</span>
            <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.3)' }}>{post.date} · {post.readTime}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 700, color: '#f0e8d0', margin: '0 0 16px', fontFamily: cinzel, lineHeight: 1.2 }}>{post.title}</h1>
          <p style={{ fontSize: 16, color: 'rgba(240,232,208,0.5)', lineHeight: 1.7, margin: 0 }}>{post.description}</p>
        </header>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 32 }}>
          {renderContent(post.content)}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 56, padding: '24px 28px', borderRadius: 16, background: 'rgba(201,148,58,0.05)', border: '1px solid rgba(201,148,58,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#f0e8d0', margin: '0 0 4px' }}>Write your manuscript on ResearchDesk</p>
            <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0 }}>AI-assisted writing, peer review simulation, citation tools & more</p>
          </div>
          <Link href="/login" style={{ textDecoration: 'none', padding: '11px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #c9943a, #e8b84a)', color: '#080c18', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
            Get Started Free →
          </Link>
        </div>
      </article>
    </div>
  )
}
