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

export default function TermsPage() {
  return (
    <div style={{ background: '#080c18', minHeight: '100vh', color: '#f0e8d0', fontFamily: inter }}>
      <nav style={{ borderBottom: '1px solid rgba(201,148,58,0.15)', padding: '18px 56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,8,15,0.8)', backdropFilter: 'blur(20px)', borderTop: '2px solid rgba(201,148,58,0.5)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.webp" alt="R" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}/>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: cinzel, letterSpacing: '0.03em' }}><span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span></span>
        </Link>
        <Link href="/" style={{ fontSize: 12, color: 'rgba(201,148,58,0.6)', textDecoration: 'none', letterSpacing: '0.06em' }}>← Back to Home</Link>
      </nav>

      <main style={{ maxWidth: 780, margin: '0 auto', padding: 'clamp(32px, 5vw, 72px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom: 60 }}>
          <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 14, fontFamily: cinzel }}>✦ &nbsp; Legal</p>
          <h1 style={{ fontSize: 44, fontWeight: 600, color: '#f0e8d0', margin: '0 0 16px', fontFamily: cinzel, letterSpacing: '0.01em', lineHeight: 1.1 }}>Terms of Service</h1>
          <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.35)', margin: 0 }}>Last updated: 30 May 2026 &nbsp;·&nbsp; By using ResearchDesk you agree to these terms.</p>
          <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(201,148,58,0.4), transparent)', marginTop: 28 }}/>
        </div>

        <Section title="1. Acceptance of Terms">
          By accessing or using ResearchDesk ("the Platform"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the Platform. These terms apply to all users including medical students, researchers, faculty, and institutions.
        </Section>

        <Section title="2. Description of Service">
          ResearchDesk provides AI-assisted tools for academic and medical research, including manuscript writing assistance, AI review, citation generation, journal selection, and research project management. The Platform is intended as a writing and productivity aid — it does not provide medical advice, clinical recommendations, or peer review.
        </Section>

        <Section title="3. User Accounts">
          <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>You must sign in using a valid Google account. You are responsible for maintaining the security of your account.</li>
            <li>You must not share your account credentials or allow others to access your workspace.</li>
            <li>You must be at least 18 years of age, or have parental/institutional consent to use the Platform.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
          </ul>
        </Section>

        <Section title="4. Acceptable Use">
          You agree not to:
          <ul style={{ margin: '10px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>Use the Platform to generate content you fraudulently represent as entirely your own original work without appropriate disclosure.</li>
            <li>Upload content that infringes copyright, contains patient-identifiable information without proper anonymisation, or violates ethical research standards.</li>
            <li>Attempt to reverse-engineer, scrape, or abuse the Platform's AI features.</li>
            <li>Use the Platform for any illegal purpose.</li>
          </ul>
        </Section>

        <Section title="5. AI-Generated Content">
          ResearchDesk uses OpenAI's language models to assist with content generation. You acknowledge that:
          <ul style={{ margin: '10px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>AI-generated content may contain inaccuracies and must be reviewed and verified by you before submission.</li>
            <li>You are solely responsible for the accuracy, ethics, and compliance of content you submit to journals.</li>
            <li>ResearchDesk does not guarantee publication and is not responsible for editorial decisions.</li>
          </ul>
        </Section>

        <Section title="6. Intellectual Property">
          You retain full ownership of all research content you create on the Platform. By using ResearchDesk, you grant us a limited, non-exclusive licence to store and process your content solely to provide the Service. We claim no ownership over your manuscripts, citations, or research data.
        </Section>

        <Section title="7. Subscription & Payments">
          Free tier features are provided at no cost. Paid plans (Scholar, Institution) are billed monthly or annually. All fees are non-refundable except where required by applicable law. We reserve the right to change pricing with 30 days' notice.
        </Section>

        <Section title="8. Limitation of Liability">
          ResearchDesk is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages arising from use of the Platform, including loss of research data, publication rejections, or academic consequences. Our maximum liability shall not exceed the fees paid by you in the past 12 months.
        </Section>

        <Section title="9. Governing Law">
          These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of New Delhi, India.
        </Section>

        <Section title="10. Contact">
          For questions about these Terms:<br/>
          <span style={{ color: '#c9943a' }}>legal@researchdesk.app</span><br/>
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
