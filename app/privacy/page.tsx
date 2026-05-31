'use client'
import Link from 'next/link'

const cinzel = "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif"
const inter  = "var(--font-inter), 'DM Sans', system-ui, sans-serif"

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 48 }}>
    <h2 style={{ fontSize: 22, fontWeight: 600, color: '#c9943a', margin: '0 0 16px', fontFamily: cinzel, letterSpacing: '0.01em' }}>{title}</h2>
    <div style={{ fontSize: 14, color: 'rgba(240,232,208,0.6)', lineHeight: 1.85 }}>{children}</div>
  </div>
)

export default function PrivacyPage() {
  return (
    <div style={{ background: '#080c18', minHeight: '100vh', color: '#f0e8d0', fontFamily: inter }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(201,148,58,0.15)', padding: '18px 56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,8,15,0.8)', backdropFilter: 'blur(20px)', borderTop: '2px solid rgba(201,148,58,0.5)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.webp" alt="R" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}/>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: cinzel, letterSpacing: '0.03em' }}><span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span></span>
        </Link>
        <Link href="/" style={{ fontSize: 12, color: 'rgba(201,148,58,0.6)', textDecoration: 'none', letterSpacing: '0.06em' }}>← Back to Home</Link>
      </nav>

      <main style={{ maxWidth: 780, margin: '0 auto', padding: 'clamp(32px, 5vw, 72px) clamp(16px, 5vw, 40px)' }}>
        {/* Header */}
        <div style={{ marginBottom: 60 }}>
          <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 14, fontFamily: cinzel }}>✦ &nbsp; Legal</p>
          <h1 style={{ fontSize: 44, fontWeight: 600, color: '#f0e8d0', margin: '0 0 16px', fontFamily: cinzel, letterSpacing: '0.01em', lineHeight: 1.1 }}>Privacy Policy</h1>
          <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.35)', margin: 0 }}>Last updated: 30 May 2026 &nbsp;·&nbsp; Effective immediately</p>
          <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(201,148,58,0.4), transparent)', marginTop: 28 }}/>
        </div>

        <Section title="1. Who We Are">
          ResearchDesk is a medical research productivity platform operated by ResearchDesk Technologies. We provide AI-assisted tools for writing, reviewing, and submitting academic and medical research manuscripts. Our registered email for privacy matters is <span style={{ color: '#c9943a' }}>privacy@researchdesk.app</span>.
        </Section>

        <Section title="2. Information We Collect">
          <p style={{ margin: '0 0 12px' }}>We collect the following categories of data:</p>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><strong style={{ color: '#f0e8d0' }}>Account data:</strong> Your name and email address provided via Google OAuth sign-in.</li>
            <li><strong style={{ color: '#f0e8d0' }}>Research content:</strong> Project titles, study types, manuscript sections, citations, and uploaded files you create within the platform.</li>
            <li><strong style={{ color: '#f0e8d0' }}>Usage data:</strong> Activity logs (e.g. "Saved Introduction", "AI reviewed Abstract") to power your workspace dashboard.</li>
            <li><strong style={{ color: '#f0e8d0' }}>Technical data:</strong> Browser type, IP address, and device information collected automatically for security and performance.</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Data">
          <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>To provide, maintain, and improve the ResearchDesk platform.</li>
            <li>To process AI-assisted generation and review requests (content is sent to OpenAI's API under their data processing agreement).</li>
            <li>To authenticate your identity and secure your account.</li>
            <li>To display your workspace dashboard, project progress, and activity timeline.</li>
            <li>We do <strong style={{ color: '#f0e8d0' }}>not</strong> sell your data to third parties.</li>
          </ul>
        </Section>

        <Section title="4. Data Storage & Security">
          Your data is stored in Supabase (PostgreSQL), hosted on secure cloud infrastructure with encryption at rest and in transit. AI processing requests are sent to OpenAI's API — only the content you explicitly submit for AI features is shared, and it is not used to train OpenAI's models under our enterprise agreement.
        </Section>

        <Section title="5. Your Rights">
          <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><strong style={{ color: '#f0e8d0' }}>Access:</strong> Request a copy of all data we hold about you.</li>
            <li><strong style={{ color: '#f0e8d0' }}>Deletion:</strong> Request deletion of your account and all associated data.</li>
            <li><strong style={{ color: '#f0e8d0' }}>Correction:</strong> Request correction of inaccurate personal data.</li>
            <li><strong style={{ color: '#f0e8d0' }}>Portability:</strong> Request an export of your research content in machine-readable format.</li>
          </ul>
          <p style={{ marginTop: 14 }}>To exercise any of these rights, email <span style={{ color: '#c9943a' }}>privacy@researchdesk.app</span>.</p>
        </Section>

        <Section title="6. Cookies">
          We use essential cookies only — for authentication sessions and security. We do not use advertising or tracking cookies. You may disable cookies in your browser settings, but this will prevent you from signing in.
        </Section>

        <Section title="7. Changes to This Policy">
          We may update this Privacy Policy periodically. We will notify users of material changes via email or an in-app notice. Continued use of the platform after changes constitutes acceptance of the updated policy.
        </Section>

        <Section title="8. Contact">
          For privacy-related questions or requests:<br/>
          <span style={{ color: '#c9943a' }}>privacy@researchdesk.app</span><br/>
          ResearchDesk Technologies, India
        </Section>
      </main>

      <footer style={{ borderTop: '1px solid rgba(201,148,58,0.1)', padding: '24px 56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#4a3820' }}>
        <span style={{ fontFamily: cinzel }}>© 2026 ResearchDesk. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {[{ label: 'Privacy Policy', href: '/privacy' }, { label: 'Terms of Service', href: '/terms' }, { label: 'Contact', href: '/contact' }].map(l => (
            <Link key={l.label} href={l.href} style={{ color: '#4a3820', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#c9943a')} onMouseLeave={e => (e.currentTarget.style.color = '#4a3820')}>{l.label}</Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
