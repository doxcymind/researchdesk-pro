'use client'
import Link from 'next/link'
import { useState } from 'react'
import { openRazorpayCheckout } from '@/lib/hooks/useRazorpay'

const cinzel = "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif"
const inter  = "var(--font-inter), 'DM Sans', system-ui, sans-serif"

const NAV_LINKS = [
  { label: 'Features',        href: '/features' },
  { label: 'For Researchers', href: '/researchers' },
]

function Nav() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 56px',
      borderTop: '2px solid rgba(201,148,58,0.55)',
      borderBottom: '1px solid rgba(201,148,58,0.15)',
      background: 'rgba(5,8,15,0.85)', backdropFilter: 'blur(24px)',
      boxShadow: '0 1px 40px rgba(0,0,0,0.6)',
    }}>
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 11 }}>
        <img src="/logo.webp" alt="ResearchDesk" style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover', border: '1px solid rgba(201,148,58,0.3)' }}/>
        <span style={{ fontFamily: cinzel, fontSize: 20, fontWeight: 700, letterSpacing: '0.04em' }}>
          <span style={{ color: '#f0e8d0' }}>Research</span><span style={{ color: '#c9943a' }}>Desk</span>
        </span>
      </Link>
      <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        {NAV_LINKS.map(item => (
          <Link key={item.label} href={item.href} className="nav-link" style={{
            fontFamily: inter, color: item.href === '/pricing' ? '#c9943a' : 'rgba(200,175,120,0.55)',
            fontSize: 13, letterSpacing: '0.02em', textDecoration: 'none',
          }}>{item.label}</Link>
        ))}
        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg, #e0b545 0%, #a06808 100%)',
          color: '#0a0600', padding: '9px 22px', borderRadius: 8,
          fontSize: 12, fontWeight: 800, textDecoration: 'none', fontFamily: inter,
          boxShadow: '0 4px 20px rgba(180,120,8,0.4)', letterSpacing: '0.01em',
        }}>Get Started</Link>
      </div>
    </nav>
  )
}

const PLANS = [
  {
    name: 'Free', price: '₹0', period: 'forever',
    color: 'rgba(240,232,208,0.5)', border: 'rgba(255,255,255,0.1)', featured: false,
    features: ['3 active projects', 'AI draft generation', 'Basic citation generator', 'Journal search', 'Community support'],
    cta: 'Get Started Free', href: '/login',
  },
  {
    name: 'Scholar', price: '₹499', period: '/month',
    color: '#c9943a', border: 'rgba(201,148,58,0.5)', featured: true,
    features: ['Unlimited projects', 'AI Reviewer (all sections)', 'All citation styles', 'Priority journal matching', 'Rejection tracker', 'AI Research Assistant', 'Zotero integration', 'Email support'],
    cta: 'Start Scholar Plan', href: '/login',
  },
  {
    name: 'Institution', price: 'Custom', period: '',
    color: '#60a5fa', border: 'rgba(96,165,250,0.3)', featured: false,
    features: ['Everything in Scholar', 'Unlimited team members', 'Department dashboards', 'Dedicated onboarding', 'Custom integrations', 'Priority support & SLA'],
    cta: 'Contact Us', href: '/contact',
  },
]

const FAQS = [
  { q: 'Is the free plan really free forever?', a: 'Yes. The Free plan has no time limit. You get 3 active projects, AI manuscript generation, citation formatting, and journal search — no credit card required.' },
  { q: 'What study types are supported?', a: 'Case reports, RCTs, cohort studies, case-control studies, systematic reviews, meta-analyses, cross-sectional studies, and qualitative research.' },
  { q: 'Can I cancel the Scholar plan anytime?', a: 'Absolutely. Cancel from your account settings at any time. You keep access until the end of your billing period.' },
  { q: 'Is Institution pricing available in USD?', a: 'Yes. Institution plans are available in INR, USD, and GBP. Contact us for a custom quote for your department or institution.' },
]

export default function PricingPage() {
  const [upgrading, setUpgrading] = useState(false)

  const handleUpgrade = async () => {
    setUpgrading(true)
    await openRazorpayCheckout()
    setUpgrading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080c18', color: '#f0e8d0', fontFamily: inter }}>
      <Nav />

      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '90px 56px 70px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 500, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(201,148,58,0.06) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16, fontFamily: cinzel, position: 'relative' }}>✦ &nbsp; Pricing</p>
        <h1 style={{ fontFamily: cinzel, fontSize: 'clamp(2.4rem, 4vw, 3.6rem)', fontWeight: 600, color: '#f0e8d0', margin: '0 auto 20px', lineHeight: 1.1, position: 'relative' }}>
          Simple, transparent pricing
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(240,232,208,0.4)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7, position: 'relative' }}>
          Start free. Upgrade when you're ready to publish more.
        </p>
      </div>

      {/* Plans */}
      <div style={{ maxWidth: 1050, margin: '0 auto', padding: '0 56px 80px' }}>
        <div className="grid-3" style={{ alignItems: 'start' }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              padding: '32px 26px', borderRadius: 22, position: 'relative',
              background: plan.featured ? 'linear-gradient(160deg, rgba(201,148,58,0.1), rgba(201,148,58,0.04))' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${plan.border}`,
              boxShadow: plan.featured ? '0 0 60px rgba(201,148,58,0.12)' : 'none',
              transform: plan.featured ? 'scale(1.03)' : 'scale(1)',
              transition: 'transform 0.2s',
            }}>
              {plan.featured && (
                <>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #c9943a, transparent)' }}/>
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #c9943a, #e8b84a)', color: '#080c18', fontSize: 10, fontWeight: 800, padding: '4px 16px', borderRadius: 20, letterSpacing: '0.1em', fontFamily: cinzel, whiteSpace: 'nowrap' }}>MOST POPULAR</div>
                </>
              )}
              <p style={{ fontSize: 12, fontWeight: 700, color: plan.color, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px', fontFamily: cinzel }}>{plan.name}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 44, fontWeight: 800, color: '#f0e8d0', fontFamily: cinzel, lineHeight: 1 }}>{plan.price}</span>
                <span style={{ fontSize: 14, color: 'rgba(240,232,208,0.4)' }}>{plan.period}</span>
              </div>
              <div style={{ height: 1, background: plan.border, margin: '22px 0' }}/>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(240,232,208,0.6)' }}>
                    <span style={{ color: plan.featured ? '#c9943a' : 'rgba(240,232,208,0.35)', fontSize: 11, flexShrink: 0 }}>✦</span>{f}
                  </li>
                ))}
              </ul>
              {plan.featured ? (
                <button onClick={handleUpgrade} disabled={upgrading} style={{
                  display: 'block', width: '100%', textAlign: 'center',
                  padding: '13px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                  background: 'linear-gradient(135deg, #c9943a, #e8b84a)',
                  color: '#080c18', border: 'none',
                  cursor: upgrading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', fontFamily: inter,
                }}>
                  {upgrading ? 'Redirecting…' : plan.cta}
                </button>
              ) : (
                <Link href={plan.href} style={{
                  display: 'block', textAlign: 'center', textDecoration: 'none',
                  padding: '13px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                  background: 'transparent', color: plan.color,
                  border: `1px solid ${plan.border}`,
                  transition: 'all 0.2s', fontFamily: inter,
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='' }}
                >{plan.cta}</Link>
              )}
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(240,232,208,0.2)', marginTop: 32 }}>
          All prices in INR · Institution pricing available in USD/GBP · Cancel anytime
        </p>

        {/* FAQ */}
        <div style={{ marginTop: 90 }}>
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <p style={{ fontSize: 11, color: 'rgba(201,148,58,0.6)', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: cinzel }}>✦ &nbsp; FAQs</p>
            <h2 style={{ fontFamily: cinzel, fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 600, color: '#f0e8d0', margin: '12px 0 0' }}>Common questions</h2>
          </div>
          <div className="grid-2" style={{ gap: 16 }}>
            {FAQS.map(faq => (
              <div key={faq.q} style={{ padding: '24px 26px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#f0e8d0', margin: '0 0 10px', fontFamily: cinzel }}>{faq.q}</p>
                <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.45)', lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(180,130,20,0.12)', background: '#0c0906', padding: '26px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#4a3820', fontSize: 12 }}>
          <div style={{ fontFamily: cinzel, letterSpacing: '0.05em' }}>© 2026 ResearchDesk. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 30 }}>
            {[{ label: 'Privacy Policy', href: '/privacy' }, { label: 'Terms of Service', href: '/terms' }, { label: 'Contact', href: '/contact' }].map(t => (
              <Link key={t.label} href={t.href} style={{ color: '#4a3820', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#c9943a')}
                onMouseLeave={e => (e.currentTarget.style.color = '#4a3820')}>{t.label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
